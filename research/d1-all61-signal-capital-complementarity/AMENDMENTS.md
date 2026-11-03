# Amendment ledger

The frozen protocol (`PROTOCOL.md` v2.1, sha256 `bf58bbda…`) is never edited; amendments are additive, dated and
labelled, and listed here and in `results/amendments.jsonl` (machine-readable).

| Id | Logged (UTC) | Kind | Scope | What and why | Effect |
|---|---|---|---|---|---|
| C1 | 2026-10-28T14:38:30Z | correction | `analysisStage.ts` (+ `tests/rubric.test.ts`); the code freeze v2 also covers the amendment machinery it needed: `freeze.ts` (code-freeze chain, `freezeCodeCorrection`) and `cli.ts` (the new stage, status lines, latest-analysis display) — disclosed late, at the results review | After the sealed analysis, its labels were checked against PROTOCOL §9 and three implementation deviations found: (1) labels excluded negative-control fold replays, which §9.2 includes (only the verdict, §9.3, excludes NC); (2) `pool-path gain (reshuffle)` was counted for any positive ΔV@5 lacking complement-type instead of "failing **only** the complement test" (§9.1); (3) qualifiers were attached to non-complement labels. Demonstrated by `tests/rubric.test.ts` (2 of 3 fail on the frozen code, all pass after the fix). | Labels and the k-of-n reshuffle count only. The verdict cannot change (NC never counts; no fold replay met C). Code re-frozen as `results/code_freeze-2.json` (amends v1); the analysis rerun as `results/analysis/ANALYSIS-2.json`; `ANALYSIS.json` kept, superseded. No other record changed. |
| C2 | 2026-10-28T15:12:5xZ (seconds before code freeze v3, 15:12:58Z) | correction (test only) | `tests/realData.test.ts`; `cli.ts` (one status line) | In the full `npm test`, the study test "the protected inputs are unchanged" failed only when it ran concurrently with `src/minute-optimizer`'s golden-master test, which writes and removes scratch files under `research/vgt-minute-optimizer/tmp/` (observed by polling `git status` during a rerun). The protected inputs were unchanged (`verify` passed). The test now ignores that other test's transient directory. | No record changes. Code re-frozen as `results/code_freeze-3.json` (amends v2; no file of parity's import closure changed). |

## Notes (no amendment needed)

- **N1 — materiality floor reading.** `analysisStage.ts` uses max($5,000, −min(worst own lot, 0)) — the magnitude of the
  worst own **loss**; PROTOCOL §9.1 writes "|worst own candidate lot net in the window|". The two differ only when the
  worst own lot is a profit above $5,000; the largest positive worst own lot of any fold replay is +$3,809, so every
  floor and flag is identical under both readings (found by the results review).
