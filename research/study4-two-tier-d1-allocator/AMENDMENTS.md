# Amendments (append-only)

The protocol was frozen at 2026-10-29T20:25:32Z (`PROTOCOL_FREEZE.json` body `4d2f5e50…`). Every later change is
recorded here and in `results/amendments.jsonl`, with what it affects. Earlier records are never rewritten.

## A1 — engine-contract clarifications from the independent reference engine (2026-10-29T20:44:09Z, before any outcome-bearing run)

**Kind:** clarification of ambiguous or non-exhaustive points of ENGINE_CONTRACT.md revision 2; no criterion,
threshold, budget, selection rule or rubric changes. **Before** the development code freeze and before any Study 4
development (4A–4D) run; the only real-data computations so far are the B5/B4/B1 parity gate (known sealed figures).

The reference engine (`src/study4-two-tier-d1-allocator/reference.ts`) was written by a separate agent from the contract
alone. Its header lists 17 resolved ambiguities (A1–A17) and its report flagged 7 inconsistent or underspecified points.
Both implementations adopt these conventions (the fast path was aligned to them where it differed; differences were
in switch-record labels, sale/purchase fields and grant counts only — never in a lot, net, mark or drawdown):

1. **Book order (§3)** for exits and fills at one bar time = the decision priority order (deep by symbol then id, then
   shallow by rank, symbol, id; frozen ties: alphabetical). It only decides labels when a shallow lot's own exit and the
   deep trade's exit share a bar time during SALE (deep first → `stale-before-sale`).
2. **Counting:** starting a switch (SALE/WAIT/LATE) or cancelling a reservation counts as granted; `declined`,
   `declined-filter` are refused; every `aborted*` outcome converts the decision's grant into a refusal (the legacy
   replay's counting); `stale-*` and `pending-at-end` stay granted.
3. **Records:** one switch record per deep decision (active book, non-P0 policy) that meets a held shallow lot or a
   shallow reservation; under P2L a shallow reservation is not cancelled and the decision is recorded `declined`. A deep
   decision during SALE/BUY/WAIT/LATE or against a lot with a pending orphan/reset sale is refused without a record.
4. **Labels are final states:** P0M late funding → `superseded`; a purchase cancelled after a sale or own exit →
   `stale-replacement`. Aborted records keep the sale fields blank (−1/NaN); the attempted fill is kept in
   `attempt*` fields. A P2L replacement's own fill fills the record's purchase fields.
5. **Orphan sale (§5.4):** at the deep symbol's next print after the purchase print — the next bar, else that session's
   closing print, else the next session's first trade.
6. **P4 (§5.6):** the recovery sale fills under `firstTradeAfterDecision` at the minute end (carried); at the deadline
   session's close processing a still-waiting switch becomes a SALE at the next session's first trade (a closing-print
   exit of that session then counts against the SALE).
7. **End of window (§9):** SALE, WAIT, LATE or BUY still pending → `pending-at-end` (a purchase is cancelled); a P2L sale
   still pending → `aborted` (legacy rule).
8. **Reset (§8):** pending switches → `pending-at-end`; a lot filled at the reset's own closing print is sold at the next
   session's first trade (until then the pool is HELD); "starts IDLE" holds once that sale is done.
9. **Exit classification (§5.3/§5.4, not exhaustive in the text):** intrabar = `stop level` or `trigger minute close`;
   own-print trigger = `trailing stop gap` or `minute open through stop`; every other exit (including the next-open
   trailing stop's `first trade after decision` fill and a pending buffered loss at the opening trade) is known before
   its print.
10. **Gates:** G1/G1d = a deep setup armed or with a pending order at the decision (activation ≤ decision time, virtual
    fill not yet processed); G2's reference high = `computeReferenceHighs(ds, L)` from session 0 (every Study 4 window
    starts at session 0).
11. **Inactive books (chained):** they keep committing their signals but are not offered, not counted and not seen by
    the gates; a switch keeps the policy it started under.

**Also recorded (no effect on results):** the per-worker trace cache holds 5,000 traces (SEARCH_PLAN §1 said 20,000; a
cache only affects speed). The development code freeze's closure includes the parity harness (`parity.ts`,
`referenceParity.ts`, `reference.ts`) so the frozen code is exactly the code whose parity is sealed; parity records are
keyed by that closure's digest. Two parity records written before the final formatting of the code
(`results/parity/PARITY_B5.json`, `PARITY_SYNTHETIC_FROZEN.json`, both PASS) are superseded by the digest-keyed ones.

**Affects:** no stage (none had run).

## A2 — fast-path correctness fixes found by the reference comparison (2026-10-29T20:50:03Z, before any outcome-bearing run)

**Kind:** correctness fixes of the fast allocator so that it implements ENGINE_CONTRACT §5.3–5.4 literally; no protocol
text, criterion or budget changes; before the code freeze and before any development run.

1. **Same-print sale (look-ahead removed).** When a forced sale was due at an opening trade and the deep trade's own
   exit (e.g. a gap stop) happened at that same print, the fast path cancelled the sale (`stale-before-sale`) — using a
   price the sale order could not have known (it was sent earlier). The contract says "the deep trade ends **before**
   the sale's event"; now a deep exit at the sale's own print lets the sale execute and the purchase is then
   `stale-replacement`. This removed a bias in favour of preemption (found by the reference engine in 1 of 4,000 random
   pools: a P4 deadline sale).
2. **P2L test order:** the legacy replacement-first and auction aborts are decided before the fill test (they are
   known before the sale is attempted).
3. **Purchase impossible in the window** (no later trade of the deep symbol): labelled `pending-at-end`.

**Affects:** no stage (none had run).

## A3 — event-order and sale-print conventions aligned with the reference engine (2026-10-29T20:52:50Z, before any outcome-bearing run)

**Kind:** clarification of ENGINE_CONTRACT §3/§5.3 adopted by both implementations (no money effect under P0; no
protocol criterion changes).

1. **Intrabar virtual exits** (`stop level`, `trigger minute close`) are processed after the switch events of their bar
   and before its fills (they fill after the bar's opening trade): a sale or purchase at the bar's open always comes
   first, so the intrabar exception of §3 holds generally (not only for the held lot's own stop).
2. **Deep exit at the sale's own print:** if its trigger was known before the print (maximum hold, buffered loss,
   pending buffered loss, a next-open stop fill, any closing-print exit) the sale is cancelled (`stale-before-sale`);
   if the trigger is the print itself (gap stop, minute open through the stop) the sale order is already out and
   executes, and the purchase is then `stale-replacement`. This is the sale-side twin of the purchase rule adopted
   after review R2-1 and refines A2(1).

**Affects:** no stage (none had run).

## A4 — the 4D refinement floor could not be spent; escalating-radius refinement (2026-10-29T21:34:35Z, after F20 4D-A, before any evaluation-year result)

**Defect.** SEARCH_PLAN §6.3 refines with *one-coordinate* neighbours (±1–2 step units) of the 50 best configurations.
A configuration with k searched books has only about 32·k such neighbours, so the 40,000–64,000-evaluation refinement
floor cannot be spent. The first sealed 4D record (F20 4D-A, sealed 2026-10-29T21:29:21Z under code freeze 1) had
**217,649 evaluations against its 240,000 floor**: initial 40,000 and evolution 160,000 exactly, refinement 17,649 of
40,000. Left as it was, every 4D experiment would fail V2 (completeness).

**Fix (code; no criterion, threshold, budget or rubric change).** The refinement keeps the plan's order — a floor of up
to 100 neighbours around the best of every cell, then the 50 best share the rest — but when a target's neighbourhood is
exhausted it escalates the radius: two coordinates ±1–2 units, then 1–3 coordinates ±1–3 units, then any structural
mutation of the target; if still short it widens the targets to the 200 and then 1,000 best. The refinement now fills
the whole experiment floor (initial + every planned generation, the extension included, + refinement), so a shortfall
of an earlier stage is also made up. Verified on the synthetic pipeline: every experiment spends exactly its floor.

**Handling.** The deficient record and its archive were moved, not deleted:
`results/superseded/F20/4D-A-freeze1/RECORD.json` and `results/archive/superseded/F20/4D-A-freeze1.jsonl.gz` (git-ignored).
F20 4D-A is rerun with the fixed code; its initial design and evolution are identical (same seeds and code), only the
refinement differs. F20's SPEC, 4A, 4B and 4C records (sealed under code freeze 1) are kept: none of their code changed
(the fix touches only the 4D refinement in `search4d.ts`, plus the freeze bookkeeping in `records.ts`/`doors.ts`). The
F20 4D-A0P run that was in progress when the defect was found was stopped before sealing (nothing written). No
evaluation-year computation of any kind had been made. The parity gate is re-run on the amended code and a second code
freeze (`results/CODE_FREEZE-2.json`) names this amendment.

**What the superseded record shows (disclosed, development data only):** 91,455 of 217,649 configurations were feasible
and the selection was no-fill (no candidate's perturbation median reached +$5,000 with ≥ 60% positive). The rerun's
pick is the binding one.

**Affects:** F20 4D-A (rerun); all later 4D stages (run with the fix).

## A5 — the evaluation crashed in the perturbation step of 4D-B (2026-10-30T02:50Z, after the evaluation door opened; no selection, criterion or threshold changed)

**Defect.** The first `evaluate` run (started 2026-10-30T02:44:50Z under `CODE_FREEZE_EVALUATION.json` body `27a9cce5…`)
stopped with `TypeError: Cannot read properties of undefined (reading 'find')` at `evaluate.ts:508` (`neighbourhoodOf`)
← `selection.ts:23` (`boundsOf`) ← `perturbGenome` ← `evaluation.ts:488`, 2026-10-30T02:47:31Z. The PROTOCOL §10.3
perturbations (and the one-at-a-time profiles) build a stand-in for the development `Context` holding the per-symbol
bands and ρ, but not `spec.b5`, which `neighbourhoodOf` reads to centre a **neighbourhood-reoptimized deep book** (4D-B)
on its B5 incumbent. 4B, 4C, 4D-A and 4D-A0P picks have only unchanged B5 deep books (never perturbed), so the first
pick with a reoptimized book (4D-B) crashed. The synthetic smoke test had used only B5 deep books and missed the path.

**Fix (evaluation code only).** `evaluation.ts` builds the stand-in with `perturbContext(world, fold)`, which adds
`spec.b5 = world.b5` (the same frozen B5 books, `loadB5()`, that every development `Context` carries). No development
file changed; no sealed record, selection, budget, criterion, threshold or rubric changed. `tests/evaluation.smoke.ts`
now also gives its picks a neighbourhood-reoptimized B5 book and a broad deep book and asserts that both occur. Before the
evaluation door was reopened, the evaluation core was dry-run with the **real sealed F20–F23 selections and stage
records on a synthetic 61-symbol market** (no door, no bar read; scratch script, outcome lines discarded) to exercise
every path the real picks reach.

**Handling.** Nothing was sealed by the crashed run (`results/evaluation/` was never written). Its evaluation-code freeze
was moved, not deleted, to `results/superseded/evaluation-freeze1/CODE_FREEZE_EVALUATION.json`, and its log to
`results/logs/evaluate-run1-crashed.log`; the evaluation code is frozen again (`results/CODE_FREEZE_EVALUATION.json`,
naming this amendment) and the whole evaluation is **rerun from the start** (a deterministic complete-stage replay;
the door log shows both evaluation-door openings).

**Disclosure: outcomes seen before the crash.** The crashed run printed, and the study lead therefore saw, these
evaluation-year figures (Δ versus B5's continuous run, 2020 / 2021 / 2022 / 2023, 5 bps, 11%):
B5 increments 2020–2023 +$165,890 / +$15,702 / +$84,937 / +$86,060 and B5 overlay parity true; **4B** chained ΣΔ
−$27,669 (−6,983 / −17,409 / −3,801 / +524), reset ΣΔ −$55,199; **4C** −$48,533 (+6,385 / −15,303 / −28,421 / −11,194),
reset −$50,971; **4D-A** −$67,337 (0 / −15,956 / −33,412 / −17,969), reset −$49,319; **4D-A0P** −$87,312 (0 / −13,485 /
−73,827 / 0), reset −$92,856. These figures could not influence the fix (forced by the crash, mechanical, and outside
anything they measure); they are computed before the perturbation step and the rerun must reproduce them exactly
(checked and recorded in `RESEARCH_RECOVERY.md`).

**Affects:** the evaluation (rerun in full); no development stage.

## A5 addendum — the complete list of files A5 changed (2026-10-30, after the final independent review; no change of any kind)

The A5 entry above names only `evaluation.ts`. Between the crash (02:47:31Z) and the refreeze (02:52:32Z) **three**
files of the evaluation closure changed, and nothing else (the two evaluation freezes differ in exactly these hashes):

1. `evaluation.ts` — the fix: the two stand-in contexts call `perturbContext(world, fold)`, which adds `spec.b5`.
2. `main.ts` — bookkeeping: `freeze-evaluation` requires an amendment id once an earlier evaluation freeze has been
   superseded and records `amendment` and `supersedes` in the new freeze.
3. `verify.ts` — bookkeeping: one added check that the superseded freeze is kept, sealed and named by the current one.
   **`floorsMet` (which feeds V2) did not change.**

No copy of the first-frozen versions was kept. The diff is proven by reconstruction:
`scripts/a5_diff_proof.py` undoes exactly these edits in memory and checks that each result hashes to the sha256 the
superseded freeze recorded for that file (all three match), and that no other file differs between the freezes.
The A5 dry run's script is kept as `scripts/a5_dryrun_synthetic.ts` (imports made repository-relative).

## D1 — post-outcome disclosure: the 4A vector floor was not fully spent in F21, F22, F23 and H (2026-10-30, found by the final independent review; no code, record, criterion or label change)

**What happened.** SEARCH_PLAN §3 sets a floor of **5,120 vectors per symbol with a band and window** (4,096 Sobol + 1,024
refinement children of 16 seeds), and its header says every floor "is always spent in full". The refinement rule takes
"8 best by standalone net (minute DD ≤ $35,000) + 8 best by idle-clean net, greedily diverse"; the implementation
(`phases.ts`, frozen in code freezes 1 and 2) seeds only the vectors that pass these filters and **never tops up** when
fewer than 16 qualify (for example F21 XLE: no top vector within $35,000 minute DD, so 8 seeds and 512 children). All
4,096 Sobol vectors ran everywhere; only refinement children are missing. Achieved coverage (machine-readable
`results/tables/4A_floor_coverage.csv`): F20 100.00%; F21 99.26% (6 symbols short, 2,112 vectors); F22 99.09% (7,
2,560); F23 97.79% (17, 6,464); H 97.50% (18, 7,296); **in all 1,410,048 of 1,428,480 (98.71%), 18,432 short**.
The completeness check `floorsMet` tests the 4D floors and only the existence of each 4A record, so neither `verify`
nor the frozen rubric's V2 detected this, and earlier report wording ("every frozen budget was spent") was wrong.

**Consequence for the verdict.** Under the rubric **as frozen in code**, V2 passes and the labels are those of
`results/FINAL.json`. Under the **literal protocol text** of V2 ("every frozen budget spent in F20–F23 and H"), V2 fails
and **every label is "invalid/incomplete"**. Under either reading no procedure beat B5 and there is **no nominee**.
Which reading binds is left to the user. Nothing was rerun: any top-up now would follow the evaluation and could change
sealed libraries and selections (PROTOCOL §11). Phase status: 4A is reported **incomplete (98.71% of its floor)**.
The missing children belong to symbols whose best standalone vectors exceeded the $35,000 drawdown screen, i.e. the
symbols least usable in the fixed slot; this is a description, not a claim that the shortfall could not matter.

**Affects:** the completeness statement of 4A and the reading of V2; no record is changed (`FINAL.json` stays sealed).
