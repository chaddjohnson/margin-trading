# Brief for the independent pre-selection-freeze review

Sent verbatim to a fresh general-purpose agent (which did not write the code) at about 10:25Z on 2026-10-26.
The text below is the exact prompt, except that the session-specific scratch path is shortened to `<scratchpad>`.

You are an independent reviewer for a preregistered research study in this repository (working directory the
repository root): `research/d1-diverse-pool-discovery/` (code in `src/d1-diverse/`). You did not write this code. Your job is to find
defects before the selection is frozen. Report what you find; do not fix anything.

**Hard rules.**
- Read-only: do not edit, create, move or delete any repository file.
- Do not run any `npm run diverse-d1` command; each of them writes sealed records.
- You may run `npx tsc --noEmit`, `npx eslint src/d1-diverse`, the study's tests
  (`node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/d1-diverse/tests/*.test.ts`),
  and read-only Python or shell over the records. Node: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.
  Put any scripts you write in `<scratchpad>/review3/` (create it), not in the repository.
- Never open or load market data after 2023-12-29. Do not read `.env`. No network access is needed.

**State.**
- `PROTOCOL.md` is frozen (`results/protocol_freeze.json`).
- The walk-forward procedure gate failed for both procedures (`results/walkforward/PROCEDURE_GATE.json`), so the
  final round is training-only exploration and nothing may be nominated.
- The final search is sealed (`results/rounds/final/search.json`).
- One post-validation amendment changed only `src/d1-diverse/final.ts` (`results/amendments.jsonl`, patch
  `amendments/amend1_final.py`). It answers minor findings 1–4 of `reviews/pre-final-round-review.md`.
- `select --window final` has just written `results/rounds/final/selection.json` (sealed) and
  `results/rounds/final/select/<arm>/` (promotion, refine-f*, assessment) plus `select/benchmarks.json`.
- The next commands, not yet run, are:
  1. `freeze-selection` (writes `FROZEN_SELECTION.json` once);
  2. `confirm-b`;
  3. `evaluate`, which with no nominee writes only a no-advancement record.

**Please verify, citing files and lines:**

1. **The final selection records are internally consistent and follow PROTOCOL §10–§13 and §15:**
   - per-arm credible sets and families (cliques, no chaining);
   - slot promotion;
   - refinement (δ = $5,000), obligatory pruning (90% lower bound on the separate prune batch, F1-guarded),
     re-refinement and the final prune;
   - assessment;
   - gates G1–G8 recomputed from the stored fields;
   - rankings with exact ties;
   - near-reference labels (R1/R4/the October 25 finalist).
2. **Nominations are empty because GP failed.** Any "would nominate" lists must be clearly hypothetical. Check that
   `selection.json` and the code path `freeze-selection` will take produce a no-advancement record with the reason.
3. **Amendment 1 is limited to `final.ts` and implemented correctly.**
   - Compare `final.ts` with the patch script.
   - The score recomputation from stored confirm-A draws must use the right net (J: net; T: net_T), the right member
     count and the sealed final calibration.
   - Records must include `select/benchmarks.json` and every `refine-f*.json`.
   - confirm-b's input verification must use the same hash function as the records.
   - The hypothetical-nominations note must be correct.
   - Data must be hashed sequentially.
   - Can `freeze-selection` or `confirm-b` throw on this data? Say exactly where if so.
4. **Did the diversification machinery actually preserve alternatives in the final round?** Use numbers from the
   records:
   - the unseeded arms got their own promoted families and assessments despite the seeded arms;
   - how many genuinely different memberships were shortlisted and assessed per arm (Jaccard distances);
   - near-duplicate finalists;
   - whether any arm's shortlist collapsed.
5. **No leakage:** nothing in the final round read bars after 2023-12-29 (door records, last dates, bar hashes).
6. Anything else that would make the frozen selection record wrong or misleading.

**Report format (this report will be saved verbatim to the study's `reviews/` folder):**
- the checks you ran;
- material findings, which would make a record wrong;
- minor findings;
- observations;
- a one-line verdict: is it safe to run `freeze-selection`, `confirm-b` and `evaluate` as they are?
