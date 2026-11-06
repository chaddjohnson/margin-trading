# Amendments to PROTOCOL.md

Each entry is dated from the clock (UTC), states what changed and why, and confirms that no validation-period
information was involved. Sealed records are never rewritten; superseded attempts are kept beside their reruns.

## A1 — 2026-11-06T17:36Z — parity comparator defect (before any search)

- **What happened.** The first sealed parity run (`results/parity/parity-attempt1.json`, sha256
  `20d45e7f5d673c9dfb5c064e04fe4bce47de8464d76b9a7f8ffa44462ab676a1`) reported 1 difference: P1 (2 runs) and P3
  (5 runs) were exact, and 59 of 60 P2 vectors were exact; vector 0 (B 5, next-open stop fills) had 3,690 engine lots
  against 3,691 Study 8 trace trades.
- **Cause (verified).** All 3,690 filled lots are identical (entry time and net, `Object.is`). The extra trace trade
  has `entryIndex −1`: Study 8's `ShadowBook.commit` records a trade at the *decision*, and this one was decided in the
  development window's last period and never filled (`pendingAtEnd` true). The engine, like the canonical D1 file,
  keeps such an order as a setup "pending at end" and invents no fill. The comparator in `src/intraday-d1/parity.ts`
  compared raw trade counts and so counted the unfilled order as a lot.
- **Change.** `compareWithStudy8Trace` now separates unfilled trace trades (`entryIndex < 0`) and requires their
  number to equal 1 when the engine ends with a pending setup and 0 otherwise; filled trades are compared exactly as
  before. Only this test/verification file changed; no decision-relevant file (engine, periods, data, space, records,
  lab, fitness, evidence, context, control — the validation guard's list) changed.
- **Rerun.** The parity stage is rerun in full (`results/parity/parity.json`). The protocol seal
  (`results/protocol_freeze.json`) keeps the pre-amendment hash of `parity.ts`; this amendment and the attempt-1 record
  are added to the chain as phase `amendment-A1`.
- **Data.** Development door only (2016–2024); no validation-period data was read.
