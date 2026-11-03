# Brief for the independent reference-engine author (separate agent context)

You are writing the **independent slow reference engine** for Study 3 Stage 1b in /home/chad/projects/margin-trading.
Its only purpose is to check, by parity, the study's fast engine. Independence is the point: implement from the
written specification only.

## Write exactly one file

`src/study3-vgt-momentum-stage1b/reference.ts` (replace the placeholder), exporting

```ts
export const referenceRun = (ds: Dataset, schedule: Policy | ScheduleItem[], options: RunOptions): RunResult
```

with the types of `src/study3-vgt-momentum-stage1b/types.ts` (do not change that file). You may also write your own
notes to `research/study3-vgt-momentum-stage1b/reviews/REFERENCE_AUTHOR_NOTES.md`. Change nothing else.

## Specification (read in full)

1. `research/study3-vgt-momentum-stage1b/ENGINE_CONTRACT.md` — the operational semantics, field by field (governs).
2. `research/study3-vgt-momentum-stage1b/PROTOCOL.md` §2–§5 and §12 (context; governs over the contract on conflict).
3. `research/study3-vgt-momentum/PROTOCOL.md` §3 (Stage 1's inherited conventions).

## You may read and import

`src/study3-vgt-momentum/signals.ts` and `features.ts` (frozen entry signals: `signalsOf`, `Features`),
`src/shared-margin-portfolio/strategy.ts` (`firstTradeAfterDecision`, `firstTradeFrom`, `priceAt`, `timeAt`),
`src/multi-etf-allocator/engine.ts` (`Tracker`), `src/four-family/data.ts` (`Dataset`),
`src/study3-vgt-momentum/tests/fixtures.ts` (synthetic builders `datasetOf`, `path`, `flatSession`, `randomWalk`),
`src/study3-vgt-momentum-stage1b/types.ts`, `context.ts`, `tests/synthetic.ts`.

## You must NOT open or read

Any other file of `src/study3-vgt-momentum-stage1b/` (in particular `engine.ts`, `guards.ts`, `paths.ts`,
`stages*.ts`, `search.ts`, `develop.ts`, `analysis.ts`, `parity.ts`, `stage1map.ts`, `tests/engine.test.ts`),
`src/study3-vgt-momentum/engine.ts`, `src/study3-vgt-momentum/reference.ts`, and anything under `data/` (no market
data). Do not run git commands that change state.

## How to build it

- Structurally different from a session-loop engine: e.g. an explicit event-driven simulation over minutes with an
  explicit account ledger (principal cash M, loan segments, interest segments, flat periods) and explicit order objects
  (pending exit, trim, entry, transition, conversion). Clarity and correctness over speed; a run of ~1,000 sessions ×
  ~390 minutes may take up to ~100 ms.
- Implement both financing modes (`net`, `slot`), all exit components, the ten re-entry rules, Z0/Z1/Z2/Z3/ZR, the
  S1/S2/S3 transitions, delays, slippages, the windows, the daily rows, the event ledger and every RunResult field.
  `pathHash`: sha256 over the Int32 sequence (per trade: entryIndex, entryBar, exitIndex, exitBar, then per trim −2,
  index, bar), hex, first 24 characters.
- Test it yourself on synthetic datasets (hand-checkable cases; `datasetOf`, `randomWalk`) in a scratch file outside
  the repository (e.g. under /tmp). Check the identities of PROTOCOL.md §3.2 on your own outputs.
- Where the contract is ambiguous, choose the reading most consistent with PROTOCOL.md and record each choice (with
  the contract section) in `REFERENCE_AUTHOR_NOTES.md`. Do not guess what another implementation does.

Reply with a short summary: what you implemented, the ambiguities you resolved, and any contract statement you believe
is wrong or contradictory.
