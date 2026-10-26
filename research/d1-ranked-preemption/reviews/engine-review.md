# Engine correctness review (independent, read-only) — saved verbatim

Reviewer: an independent subagent that did not write the code. Brief: the conversation's engine-review prompt
(read-only; synthetic fixtures only; scope `src/d1-ranked-preemption/{allocation,engine,replay}.ts` and tests against
the frozen originals and PROTOCOL.md §5). Received 2026-10-26 ~17:30Z, before the protocol freeze. Dispositions:
`DISPOSITIONS.md`. Probe scripts were written under the session scratchpad `review/` folder (not part of the repo).

---

# Adversarial review: `src/d1-ranked-preemption/` engine, replay and allocation

## (a) Verdict

I found no MATERIAL defect in `allocation.ts`, `engine.ts` (`runPAllocator`) or `replay.ts` (`replayPreemptive`).
- **P0 path.** It is statement-for-statement the frozen one. The body diff shows exactly the claimed 5 equivalent rewrites, plus added branches that all sit behind a policy check. The frozen sources are unchanged in git.
- **P1 semantics.** They match PROTOCOL §5.3 rules 1–10. Decisions use only the last price and the current pool state, and the booked lot net equals the tested net in both ledgers.
- **Engine vs replay.** They agreed field for field (lots, signals, daily rows, drawdowns, preemption records, declines, net) on every synthetic run I could build: about 8,250 policy runs on 1,650 random universes, under P0, P0R, P1, P1-B250 and P1-B500. Under P1 alone that covered about 1,340 executed, 60 superseded and 1,500 aborted preemptions and 5,300 declines. It included closing-print sales, next-session sales, same-minute and later replacement fills, a warm-up start, arming and a truncated end. There were 0 differences.
- **Portfolio vs fixed.** Portfolio-mode P1 funded the same sequence as fixed P1 in 450 random universes with dividends, and no engine assertion fired.

**Safe to use for optimization**, provided the real-data parity gate passes. Fix finding 1 (cheap) and add the missing tests (finding 6) before the code freeze. Findings 2–5 are spec or reporting clarifications.

## (b) Findings

1. **MINOR — `windowStarts = [startIndex]` is accepted but silently produces no window.**
   - Where: `src/d1-ranked-preemption/replay.ts:687-691` (the guard accepts `index >= startIndex`) and `:799`/`:859` (windows are only created inside `for (let s = startIndex + 1 …)`).
   - Effect: `result.windowed` is `[]`, so `walkforward.ts:156` / `final.ts:277` (`m.windowed[0]!`) would get `undefined` and throw later, or silently drop the figure.
   - Exposure today: none, because the study passes `boundary` (the search-end session), which is always > startIndex. Repro: `window-start.ts` below prints `windowStarts [0] -> []`.
   - Fix: require `index > startIndex`, or create the trackers for `index === startIndex` before the loop.

2. **MINOR (spec prose, before the protocol freeze) — a replacement can be preempted in the bar it was bought.**
   - Where: `engine.ts:1343-1354`, `replay.ts:450`. Rule 3 allows a decision against any single funded lot, including a replacement that filled at step 5 of the same minute.
   - Scenario S3 below, 0 bps: VGT sells XRT and is bought at the 14:34 open. GDX (higher) decides at the end of 14:34, VGT's estimate is exactly $0, and VGT is sold at 14:35 for net $0, then GDX is bought. VGT was held one minute.
   - Engine and replay agree and it is causal, but it is a two-bar chain that the §5.3 rule 6 wording ("no chain forms in one bar") does not obviously intend. With costs it needs a one-minute gain above both frictions; on volatile ETFs at 5 bps that is plausible.
   - Fix: either state explicitly in §5.3 that a replacement is preemptable from its purchase bar on, or add a frozen rule (e.g. a lot cannot be preempted by a decision in its entry bar or entry session).

3. **MINOR (reporting) — superseded records leave fields at defaults.**
   - Where: `engine.ts:1405-1408`, `replay.ts:415-418`.
   - Superseded records keep `releasedPrincipal: 0` and NaN `executionNet/Interest/Gross/exitFriction`. The own exit did release the principal.
   - Nothing downstream sums these fields yet. A report of "switching friction" or "released principal" over all records will hit NaN or 0.
   - Fix: set `releasedPrincipal` on supersession, and document which fields are NaN per outcome.

4. **MINOR (latent, unused by the study).**
   - `replay.ts:502,504` hard-code `>= 0` in `actionable` instead of a threshold. This is correct for the P1 $0 criterion in §9.
   - `replay.ts:475-476` computes `hindsightHolderNet` without stop slippage. The study uses `stopSlippageBps = 0`.
   - `allocation.ts:25`: the P1-B250/B500 dollar thresholds would be applied unscaled to portfolio lots (20% of equity). §12 runs B250/B500 only in the fixed pool.
   - `engine.ts:783` hard-codes the replacement reservation's `slot: 0`. This is harmless with one slot.

5. **MINOR (gate process; `parity.ts` was still being edited during the review).**
   - §5.1(iii) lists P0, P0R, P1, P1-B250. `parity.ts` runs only `['P0R','P1','P1-B250']`, so the derived engine vs derived replay under P0 on random pools is covered only by transitivity, and P1-B500 not at all.
   - The coverage condition (≥ 20 P1 runs with an executed preemption) is checked inside the write-once sealed run. A coverage shortfall would seal `pass: false`, which `freezes.ts:103` treats as "the study stops".
   - Fix: add P0 (and B500) to (iii), and make coverage deterministic (dry-run the pool draw, or loop until coverage is met) before sealing.

6. **MINOR — test adequacy gaps (§18 / brief §5 "Mandatory adversarial tests").** My probes show each of these branches works; none has a unit test.
   - **Portfolio margin refusal with the incumbent open** (`engine.ts:1356-1370`): untested. S4 shows it works: at fraction 0.9 the reason is "no preemption: Reg T initial margin with the incumbent open", while fixed mode executes.
   - **A successful closing-print sale** (the `atClose` path at `engine.ts:1415-1420`, `replay.ts:390,397`): never exercised. The weekend test decides at closeTime; the abort and end-of-data tests have no closing print.
   - **End of data:**
     - a sale due after the last static event (`replay.ts:654-656`);
     - a replacement still reserved at the end (`reservationsAtEnd`, `replacementLotId = -1`).
     - Neither is tested (S1).
   - **Supersession** is tested only via 'trailing stop gap' with a same-minute replacement fill. Untested:
     - supersession by maximum hold or buffered loss;
     - a replacement that fills later (S2), which is the negative branch of `fillsAtTime` (`replay.ts:792-797, 889`).
   - **Untested scenarios:**
     - the incumbent's own exit in the same minute as a higher-priority decision (the pool frees, plain grant);
     - repeated preemptions, or preempting a replacement (S3);
     - a fill-time abort driven by friction at a same-session next trade (only the estimate-stage decline and the interest-driven weekend abort are covered).
   - **Policies and window parameters never unit-tested:**
     - P1-B250 / P1-B500, so the $250 boundary is untested;
     - `accountingStartIndex > 0`, `eligibilityIndex > start` and `endIndex < last` (always 0 / full range);
     - `windowStarts`;
     - `diagnose`.
   - **Weak assertions:**
     - "One lot at a time" is asserted only on daily rows. Assert `lots[i].exitTime <= lots[i+1].entryTime` too.
     - The mutation test changes bars, but not `sOpen/sHigh/sLow/sClosingPrint`, so the mutated fixture is inconsistent. It still holds for causality because everything mutated is after the switch.
     - The P0 = frozen-engine unit test uses only the four frozen books (no fifth or candidate book). Real-data (i) covers B5.
   - **§18 "Plus" items absent from `tests/`:** the loader post-cutoff mutation test, ranking recomputation and ranking hash checks.
   - **No code path to test:** "unqualified/stale signals" and "non-tradable symbols".

## (c) Probe scripts

All are under `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/9d1b06b5-6c64-4f8c-b4ce-597029e85d41/scratchpad/review/` and use synthetic fixtures only. None found a counterexample.
- `fuzz.ts` — engine vs replay, 5 policies, random universes. Pasted below.
- `fuzz-window.ts` — the same with start index 0–3, arming offset 0–2 and end index trimmed by 0–4 sessions. 0 failures.
- `portfolio-fuzz.ts` — portfolio P1 funded sequence = fixed P1 funded sequence when no margin refusal is recorded; booked net = tested net. 0 failures in 900 comparisons.
- `diagnose-fuzz.ts` — P0R + `diagnose`: the first overlap that is rank-higher with estimate ≥ 0 equals P1's first preemption, and `actionable ⇔ executed`. 0 failures in 600 universes. It also tallies coverage and found the `windowStarts` issue.
- `scenarios.ts` (S1–S4) and `window-start.ts` — pasted below.

```ts
// window-start.ts — windowStarts = [startIndex] passes the guard but never creates a window.
import { replayPreemptive } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/replay.ts';
import { dipTo, flats, replayBooksOf, weekdayUniverse } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/tests/fixtures.ts';

const universe = weekdayUniverse({ VGT: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)] });
const spec = { symbols: ['VGT'], costBps: 0, rate: 0.11 };
const run = (windowStarts: number[]) =>
  replayPreemptive(replayBooksOf(universe, spec), {
    symbols: ['VGT'], startIndex: 0, endIndex: universe.sessionCount - 1, principal: 100000, rate: 0.11,
    costBps: 0, stopSlippageBps: 0, detail: false, windowStarts
  }).windowed.map((w) => w.startIndex);
console.log('windowStarts [0] ->', run([0]), '; [1] ->', run([1]));
// output: windowStarts [0] -> [] ; [1] -> [ 1 ]
```

```ts
// scenarios.ts — targeted scenarios (parity OK in S1–S3; S4 shows the portfolio margin branch)
import assert from 'node:assert/strict';
import { compareValues, outputsOf } from '/Users/chad/development/personal/margin-trading/src/portfolio-aware-d1/compare.ts';
import { type PRunResult, runPAllocator } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/engine.ts';
import { replayPreemptive } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/replay.ts';
import { type FixtureRun, allocationFor, bookOf, configOf, dipTo, flat, flats, replayBooksOf, weekdayUniverse }
  from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/tests/fixtures.ts';
import type { NUniverse } from '/Users/chad/development/personal/margin-trading/src/portfolio-aware-d1/nbook/engine.ts';

const parity = (universe: NUniverse, spec: FixtureRun, label: string) => {
  const full = runPAllocator(universe, configOf(spec));
  const fast = replayPreemptive(replayBooksOf(universe, spec), {
    symbols: spec.symbols, startIndex: 0, endIndex: universe.sessionCount - 1, principal: 100000,
    rate: spec.rate ?? 0.11, costBps: spec.costBps ?? 0, stopSlippageBps: 0, detail: true, allocation: allocationFor(spec)
  });
  const { preemptions, declines, allocationKey, priorityOrder, ...rest } = outputsOf(full) as PRunResult;
  void allocationKey; void priorityOrder;
  const diffs = [
    ...compareValues(rest, fast.full),
    ...compareValues(preemptions.map((x) => ({ ...x, targetVirtualState: '' })), fast.preemptions),
    ...compareValues(declines, fast.declines)
  ];
  console.log(`${label}: parity ${diffs.length === 0 ? 'OK' : 'DIFF ' + diffs.slice(0, 4).join('; ')}`);
  return { full, fast };
};
const p1 = (extra: Partial<FixtureRun> = {}): FixtureRun =>
  ({ symbols: ['VGT', 'XRT'], policy: 'P1', order: ['VGT', 'XRT'], rate: 0, costBps: 0, ...extra });

// S1: sale due after the last static event; replacement never fills (no later VGT bar, no closing print).
{
  const universe = weekdayUniverse({
    XRT: [...flats(3, 112), dipTo(112, 100), flat(100.5), { closes: Array(8).fill(100.5), slots: [0, 1, 2, 3, 4, 5, 6, 7] }],
    VGT: [...flats(5, 100), { closes: [100, 89, 88, 89.5], slots: [0, 1, 2, 3], closingPrint: false }]
  });
  const { full, fast } = parity(universe, p1(), 'S1');
  assert.equal(full.preemptions[0]!.outcome, 'executed');
  assert.deepEqual(full.reservationsAtEnd.map((x) => x.symbol), ['VGT']);
  assert.equal(fast.preemptions[0]!.replacementLotId, -1);
}
// S2: superseded by a maximum-hold exit (hold 1 day, opens below entry); the replacement fills 4 minutes later.
{
  const universe = weekdayUniverse({
    XRT: [...flats(3, 112), dipTo(112, 100), { closes: [100.2, 100.2, 100.2], opens: [99.9], slots: [0, 1, 2] }, ...flats(2, 100.2)],
    VGT: [...flats(3, 100), { closes: [100, 89, 88], slots: [0, 1, 2] }, { closes: [89.5, 89.5, 89.5], slots: [0, 5, 6] }, ...flats(2, 89.5)]
  });
  parity(universe, p1({ books: { XRT: bookOf('XRT', { maximumHoldDays: 1 }), VGT: bookOf('VGT') } }), 'S2');
  // -> pre#1 superseded (maximum hold); lot#1 XRT exit 14:31; lot#2 VGT entry 14:35
}
// S3: the replacement is preempted in the minute it is bought (0 bps: net exactly $0).
{
  const universe = weekdayUniverse({
    XRT: [...flats(3, 112), dipTo(112, 100), ...flats(5, 100.5)],
    VGT: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)],
    GDX: [...flats(5, 100), { closes: [100, 89, 88, 89.5, 89.5, 89.5], slots: [0, 2, 3, 4, 5, 6] }, ...flats(3, 89.5)]
  });
  parity(universe, p1({ symbols: ['GDX', 'VGT', 'XRT'], order: ['GDX', 'VGT', 'XRT'] }), 'S3');
  // -> lot#1 XRT sold 14:34 (net 500); lot#2 VGT 14:34 -> 14:35 priority_preemption net 0.00; lot#3 GDX 14:35
}
// S4: portfolio, fraction 0.9: margin binds only with the incumbent open -> no preemption; fixed mode executes.
{
  const universe = weekdayUniverse({
    VOOG: flats(10, 100), VGT: [...flats(5, 100), dipTo(100, 89), ...flats(4, 89)],
    XRT: [...flats(3, 112), dipTo(112, 100), ...flats(6, 100.5)]
  });
  const spec = p1({ mode: 'portfolio', rate: 0.11, costBps: 5 });
  const portfolio = runPAllocator(universe, { ...configOf(spec), fraction: 0.9 });
  console.log(portfolio.signals.find((s) => s.symbol === 'VGT')!.reason);
  // -> "pool occupied (XRT lot 1); no preemption: Reg T initial margin with the incumbent open"
  console.log(runPAllocator(universe, configOf({ ...spec, mode: 'fixed' })).preemptions[0]!.outcome); // executed
}
```

```ts
// fuzz.ts — derived engine (fixed) vs derived replay under every policy on random synthetic universes.
// Usage: node --experimental-transform-types fuzz.ts <seed> <runs>. Seeds 1–5, 41–43 and 77 ran: 0 failures.
import { compareValues, outputsOf } from '/Users/chad/development/personal/margin-trading/src/portfolio-aware-d1/compare.ts';
import { type PolicyKey } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/allocation.ts';
import { type PRunResult, runPAllocator } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/engine.ts';
import { replayPreemptive } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/replay.ts';
import { type FixtureRun, type SessionSpec, allocationFor, configOf, replayBooksOf, weekdayUniverse, bookOf }
  from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/tests/fixtures.ts';

let seed = Number(process.argv[2] ?? 1);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const randomSessions = (count: number): SessionSpec[] => {
  const out: SessionSpec[] = []; let p = 100;
  for (let d = 0; d < count; d++) {
    const n = 2 + Math.floor(rnd() * 8); const slots: number[] = []; const sparse = rnd() < 0.5;
    let slot = Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) { slots.push(slot); slot += sparse ? 1 + Math.floor(rnd() * 40) : 1; }
    if (slots.at(-1)! > 389) { const k = 389 / slots.at(-1)!; for (let i = 0; i < n; i++) slots[i] = Math.min(389, Math.floor(slots[i]! * k) + i); }
    for (let i = 1; i < n; i++) if (slots[i]! <= slots[i - 1]!) slots[i] = slots[i - 1]! + 1;
    if (slots.at(-1)! > 389) continue;
    const closes: number[] = []; const opens: (number | undefined)[] = [];
    for (let i = 0; i < n; i++) {
      const shock = rnd() < 0.15 ? (rnd() - 0.6) * 0.16 : (rnd() - 0.48) * 0.03;
      if (i > 0 && rnd() < 0.3) opens.push(Math.round(p * (1 + (rnd() - 0.5) * 0.01) * 100) / 100);   // intrabar gaps
      else if (i === 0 && rnd() < 0.3) { p = p * (1 + (rnd() - 0.5) * 0.12); opens.push(p); }       // overnight gaps
      else opens.push(undefined);
      p = Math.max(5, p * (1 + shock)); closes.push(Math.round(p * 100) / 100);
    }
    out.push({ closes, slots, opens, closingPrint: rnd() < 0.85 });
  }
  return out;
};
const policies: PolicyKey[] = ['P0', 'P0R', 'P1', 'P1-B250', 'P1-B500'];
let failures = 0;
for (let r = 0; r < Number(process.argv[3] ?? 200); r++) {
  const symbols = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 4)).sort();
  const sessions = 25 + Math.floor(rnd() * 25);
  const specs: Record<string, SessionSpec[]> = {};
  for (const symbol of symbols) { let s = randomSessions(sessions); while (s.length < sessions) s = s.concat(randomSessions(sessions - s.length)); specs[symbol] = s.slice(0, sessions); }
  const universe = weekdayUniverse(specs);
  const order = [...symbols].sort(() => rnd() - 0.5);
  const costBps = pick([0, 2, 5, 10]); const rate = pick([0, 0.11]);
  const books = Object.fromEntries(symbols.map((symbol) => [symbol, bookOf(symbol, {
    targetPercentChange: pick([30, 50, 80, 100]), trailingBuyPercentage: pick([5, 10, 20]),
    trailingStopPercentage: pick([10, 20, 30, 50]), maximumHoldDays: pick([1, 2, 3, 5, 30]),
    tickWindowSize: pick([2, 3, 4]), intradayLossBuffer: pick([0, 10, 30, 500]),
    pullback: pick([20, 30, 50]), continuationWindow: pick([1, 3, 5]) })]));
  for (const policy of policies) {
    const spec: FixtureRun = { symbols, policy, order: policy === 'P0' ? undefined : order, costBps, rate, books };
    const full = runPAllocator(universe, configOf(spec));
    const fast = replayPreemptive(replayBooksOf(universe, spec), { symbols, startIndex: 0, endIndex: universe.sessionCount - 1,
      principal: 100000, rate, costBps, stopSlippageBps: 0, detail: true, allocation: allocationFor(spec) });
    const { preemptions, declines, allocationKey, priorityOrder, ...rest } = outputsOf(full) as PRunResult;
    void allocationKey; void priorityOrder;
    const diffs = [...compareValues(rest, fast.full),
      ...compareValues(preemptions.map((x) => ({ ...x, targetVirtualState: '' })), fast.preemptions),
      ...compareValues(declines, fast.declines)];
    if (full.lots.reduce((t, l) => t + l.net, 0) !== fast.net) diffs.push('net');
    if (diffs.length > 0) { failures++; console.log(`run ${r} ${policy}`, diffs.slice(0, 6)); }
  }
}
console.log(`failures ${failures}`);
```

## (d) What I checked and found correct

- **P0 = frozen (item 1).**
  - **Body diff.** The 5 replaced lines are equivalent:
    - the signature;
    - the occupancy label: `pending` is always undefined under P0;
    - `book.commit(..., record.outcome)`: `record.outcome` is exactly `result.grant ? 'granted' : 'refused'` when `start` is undefined;
    - the extra fields on the returned object;
    - the dropped re-export.
  - **Added branches.** Every one is guarded: `policy.preemption`, `policy.rankedTies`, `pending` and `replacementOf` stay empty under P0. Helpers and imports are the frozen ones, or imported from the frozen file.
  - **Derived replay under P0.** It is identical to the frozen replay:
    - `decisionRank = ties.indexOf` under P0;
    - the event keys are the same computation;
    - `occupiedBy: label` equals the frozen `grant ? '' : label`;
    - the `allocator` labelling is the same, because `refusedTrades ∩ funded = ∅` under P0;
    - `fillsAtTime` can never be true under P0, because the next funded fill is at least 60 s after the exit.
  - **Optional inputs.** `diagnose` and `windowStarts` do not change P0 outputs.
  - **Checks run.** The unit tests pass (17/17). `tsc --noEmit` (via `node node_modules/typescript/bin/tsc`) reports 0 errors. `git status` confirms no frozen source changed.
- **Causality and the two-stage test (item 2).**
  - The estimate uses `lastClose` (engine) / `lastPriceAt` (replay), the completed bar at or before the decision, with interest through the decision session.
  - The binding test is at the incumbent's first trade at or after `decisionTime`: the same-session bar, else the closing print only if `decisionTime < closeTime`, else the next session's bar 0. This matches `firstTradeAfterDecision`.
  - Interest runs through that session (a Friday→Monday sale adds 3 days).
  - `fixedLiquidation` / `portfolioLiquidation` perform the same operations in the same order as `FixedLedger.closeLot` / `NPortfolioLedger.closeLot`, so the engine's `incumbent.net !== fill.net` assertion can never fire spuriously.
  - The replay looks ahead only for the time of the sale event, never for a price, exit or fill. Exits are pre-computed by the frozen `ExitManager.evaluate`, but the allocator only observes an exit after it executes.
- **Pool and ordering rules.**
  - One lot at a time: the pending replacement is not a reservation, and `assertPoolCap` runs at fund time.
  - Same-minute order: exits (step 3 / phase 0) → sale (3b / 0.5) → fills (5 / 1) → decisions (6 / 2).
  - Supersession by the incumbent's own exit is detected in the same minute in both implementations.
  - The three aborts:
    - the replacement order fills first;
    - the fill-time net is below the threshold;
    - end of data, where a sale due after the last event is still executed.
  - A pending preemption blocks every decision, and a reservation is never preempted.
  - Shadow books are never touched. The incumbent cannot re-signal while its virtual position is open, the lot's later virtual exit moves no money, and `allocator` / `fundedLotId` labels are right after aborts.
  - Lot ids agree: the engine assigns them at fill, the replay at funding, and they coincide because funded lots fill in order.
- **Engine–replay equivalence (item 3).**
  - Within a minute: the dynamic sale is resolved lazily before the first event with a strictly greater key. The minute where a sale and a replacement buy coincide is marked once (`fillsAtTime`).
  - At the session level: closing-print sales and fills agree, and `incumbentVirtualOpen` reconstructs correctly.
  - P0 `diagnose` actionable counts are consistent with what P1 actually does.
  - Windowed drawdowns receive exactly the main tracker's update stream from the boundary close onwards. They are replay-only, so no engine cross-check exists.
- **Portfolio P1 (item 4).**
  - The margin tests reuse the refused gate's Reg T / house maxima, computed with the incumbent open.
  - The sale books through `NPortfolioLedger.closeLot`, logs the exit and schedules the frozen core orders.
  - No lot dividend is paid after the sale, while the ex-date entitlement at the open is kept.
  - `assertPoolCap` holds at fund time and at the replacement's fill.
  - The scale-free sign gives the fixed pool's funded sequence when margin does not bind (fuzz above).
