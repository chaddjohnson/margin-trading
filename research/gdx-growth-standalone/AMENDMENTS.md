# Amendments — Priority 4A (gdx-growth-standalone)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze; after it, `A*` (substantive) or `O*` (operational). Criteria are never loosened by amendment once
results they govern exist.

## Before the freeze

### R1 — 2026-11-10T17:44Z — pilot findings fixed before the freeze (engineering)

- **Change.** (1) `diagnostics.ts`: the causal no-new-funding window of the largest winning episode now starts at the
  episode's first lot's **decision** session (the engine's blackout refuses decisions by their decision session; a Rise
  decision is made at the close before its fill), not at its first entry fill. (2) `folds.ts`: a fold's non-Appendix-A
  controls are labelled "control (descriptive)". (3) `bench.ts`: the duplicate-key test's watchdog timer is cleared and
  unreferenced. (4) `tools/gdx-growth-standalone/tables.ts`: table cells escape `|`.
- **Why.** Found by the pilot (`results/pilot/PILOT.md`): a pilot subject's top-episode rerun showed a $0.00 causal
  contribution because its opening decision fell one session before the window; the duplicate-key test passed in 2.5 s
  but its unit stayed alive for 10 minutes on the timer.
- **Results that existed.** Engineering only: the sealed control manifest and engineering gates (unaffected: none of
  these files is in the evaluation digest or the gates), the bench, pilot mechanics on P18.
- **Effect.** Diagnostics and reporting only; no evaluation, gate, budget or rule changes. The full pilot rerun (`ref2`)
  passed every stage with byte-identical independent lane results.

### R2 — 2026-11-10T17:44Z — the resource contract from the bench; the protocol header and test description; re-adoption

- **Change.** `context.ts`: 12 workers (was a 14 placeholder) and a full GC every 256 evaluations (was 64), the 256 MiB
  ArrayBuffer trigger kept, book cache 256 (§13). The protocol header cites the pilot; §12 describes this study's 7 unit
  tests and the pilot's duplicate-key test exactly. `STANDARD_ADOPTION.json` re-adopted with the protocol's final sha256.
- **Why.** The bench (PILOT.md): throughput is CPU-bound at ≈ 160 evaluations/s from 10 to 16 workers; 12 workers with
  GC every 256 gave the fastest stable configuration (177.5/s, 7.7 GiB) with flat worker ArrayBuffers (≈ 62.5 MiB).
- **Results that existed.** Engineering only (bench, pilot, gates).
- **Effect.** Operational settings only; budgets, rules and gates unchanged.

## After the freeze

### A1 — 2026-11-10T18:37:29Z — a post-validation, report-only decision-funnel diagnostic on FULL

- **Change.** `tools/gdx-growth-standalone/validation-funnel.ts` opens FULL once more, behind the committed frozen
  selection, and computes Priority 3A's Growth·GDX decision funnel (signals and crossings, dispositions, eligibility
  arming, expiry and invalidation, decisions) for every frozen validation member over 2025-01-02 → 2026-10-30 and over
  2024, sealed as `results/validation/funnel.json`.
- **Why.** The sealed validation (`f28fabd1`) shows that the primary and most role holders made no trade after 2024
  (validation P&L $0.00, V1 fails). The brief asks for the reasons for sparse decisions; the frozen diagnostics covered
  2016–2024 only.
- **Results that existed.** Every development record, `FROZEN_SELECTION.json` and the validation (all sealed and
  committed).
- **Effect.** Report-only: it reads frozen configurations, selects nothing, changes no gate, role, primary, record or
  verdict; no rescue search, no retuning. The extra door opening is logged in `results/doors.jsonl`.
