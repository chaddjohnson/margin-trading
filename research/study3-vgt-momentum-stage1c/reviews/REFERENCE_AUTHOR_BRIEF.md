# Brief for the independent reference-engine author (separate agent context) — Stage 1c

You are writing the **independent slow reference engine** for Study 3 Stage 1c in /home/chad/projects/margin-trading.
Its only purpose is to check, by parity, the study's fast engine. Independence is the point: implement the Stage 1c
additions from the written specification only.

## Write exactly one file

`src/study3-vgt-momentum-stage1c/reference.ts` (replace the placeholder), exporting

```ts
export const referenceRun = (ds: Dataset, schedule: Policy | ScheduleItem[], options: RunOptions): RunResult
```

with the types of `src/study3-vgt-momentum-stage1c/types.ts` (do not change that file). You may also write your notes
to `research/study3-vgt-momentum-stage1c/reviews/REFERENCE_AUTHOR_NOTES.md`. Change nothing else in the repository.

## Specification (read in full)

1. `research/study3-vgt-momentum-stage1c/ENGINE_CONTRACT.md` — §11–§15 are the Stage 1c additions (governs);
   §1–§10 incorporate Stage 1b's contract.
2. `research/study3-vgt-momentum-stage1b/ENGINE_CONTRACT.md` and `research/study3-vgt-momentum-stage1b/AMENDMENTS.md`
   (A1) — the base semantics.
3. `research/study3-vgt-momentum-stage1c/PROTOCOL.md` §3–§4 and §8 (context; governs over the contract on conflict).

## Starting point (allowed)

Stage 1b's reference, `src/study3-vgt-momentum-stage1b/reference.ts`, was written independently of Stage 1b's fast
engine and passed parity with it. **Start from a copy of it** (it implements §1–§10) and add §11–§14: the account
loss record R, rule A (eligibility, the open check, both fill modes, the working order, the fallback, counters), rule B
(cooldown, the frozen intraday reference and its restart), rule C (level, tolerance, C-cross as an upward cross),
discarded-decision semantics, `restrictionCarry` (`persist` / `reset`), the per-trade fields `cLevel`, `cFillBelow`,
`releaseEntry`, the exit reason `losing hold`, the counters, the `blocks` and `aEvents` arrays, and the XN component
(Stage 1b's `d1net` with an always-on `hard`, already representable as an ExitSpec). With no `protect` on any policy
your engine must behave exactly as Stage 1b's reference.

## You may read and import

`src/study3-vgt-momentum-stage1b/reference.ts` (to copy), `src/study3-vgt-momentum-stage1c/types.ts`,
`src/study3-vgt-momentum-stage1b/types.ts`, `src/study3-vgt-momentum/signals.ts` and `features.ts`,
`src/shared-margin-portfolio/strategy.ts` (fill primitives), `src/multi-etf-allocator/engine.ts` (`Tracker`),
`src/four-family/data.ts` (`Dataset`), `src/study3-vgt-momentum/tests/fixtures.ts` and
`src/study3-vgt-momentum-stage1b/tests/synthetic.ts` (synthetic builders), and Stage 1b's
`reviews/REFERENCE_AUTHOR_NOTES.md`.

## You must NOT open or read

`src/study3-vgt-momentum-stage1c/engine.ts`, `tests/`, `search.ts`, `develop.ts`, `parity.ts`, `guards.ts`,
`evaluate.ts`, `analysis.ts` (any Stage 1c file except `types.ts` and the placeholder you replace);
`src/study3-vgt-momentum-stage1b/engine.ts` and Stage 1b's other implementation files except `reference.ts` and
`types.ts`; `src/study3-vgt-momentum/engine.ts`; anything under `data/` (no market data). Do not run `npm test` or any
git command that changes state.

## How to build it

- Keep the reference's structure (explicit event-driven simulation, explicit ledger and order objects). Clarity over
  speed.
- Test it yourself on synthetic datasets only (`datasetOf`, `flatSession`, `path`, `randomWalk`, `syntheticMarket`)
  in a scratch file under /tmp/claude-1000/ (outside the repository): hand-checkable cases for every §15 expectation
  and the ledger identities.
- Where the contract is ambiguous, choose the reading most consistent with PROTOCOL.md and record each choice (with
  the contract section) in `REFERENCE_AUTHOR_NOTES.md`. Do not guess what another implementation does.

Reply with a short summary: what you implemented, the ambiguities you resolved, and any contract statement you believe
is wrong or contradictory.
