# Confirmatory review of the fixes (independent, read-only) — saved verbatim

Reviewer: an independent subagent that wrote neither the protocol nor the code. Brief: the conversation's
confirmatory-review prompt (verify the dispositions of `preregistration-review.md` and `engine-review.md`; synthetic
probes only). Received 2026-10-26 ~18:00Z, before the protocol freeze. Dispositions of its findings: the
"Confirmatory review" section of `DISPOSITIONS.md`.

---

# Confirmatory review: `d1-ranked-preemption`, fixes after the two earlier reviews (independent, adversarial, read-only)

Reviewed 2026-10-26, finished about 18:00 UTC (`date -u`; file listings show local time). I edited no repository file, ran no `ranked-preemption` command and read nothing under `data/` or `.env`. I ran only the study's synthetic tests, `tsc --noEmit` and synthetic probes in the scratchpad `confirm/` folder.

Hashes at review time:
- `PROTOCOL.md` `4b78c347…`
- `context.ts` `1c665bec…`
- `engine.ts` `42bd7ed2…`
- `replay.ts` `37135550…`
- `DISPOSITIONS.md` `816c8a45…`
- The frozen `nbook/engine.ts` (`9b346011…`) and `portfolio-aware-d1/replay.ts` (`9da17057…`) are unchanged in git.

## (a) Verdict

**Safe to freeze after resolving finding 1.** It is a one-line gate decision, either way.

I found no defect in the engine, the replay, the diagnostic, the doors or the budgets:
- All five earlier MATERIAL findings are fixed consistently in the protocol text and the code.
- The new auction rule is causal: it uses bar timestamps and availability only, never a price.
- The intrabar own-stop rule is the same in the engine, the replay and the diagnostic.
- P0 is still the frozen behaviour.
- Engine = replay held on every synthetic counterexample I could build (0 differences).

Findings 2–8 are minor.

## (b) Findings

### 1. MATERIAL (a gate decision before the freeze): B4 is never a gate comparator

- **Where:** PROTOCOL §13.3 F2 (`PROTOCOL.md:399–400`), §14.2 N2 (`:422`) and §14.4 (`:431`) compare only with A = B5. In code: `walkforward.ts:231–232`, `final.ts:93–96` and `final.ts:291`.
- **Why it matters:** brief §7 says to "freeze procedure-level gates … minimum material improvement over **B4/B5**". Protocol §0 says "B4 stays the default". B5 = B4 + GDX share one slot, so in a validation fold B4 can beat B5. GDX can hold the slot, or B5's two big GDX trades can be absent.
- **Scenario:** in fold-b, V(B4) − V(B5) = +$12,000 and V(D) − V(B5) = +$6,000.
  - D passes F2 while sitting $6,000 below the default B4 out of sample.
  - The same can happen in the other fold, and then GP passes.
  - N2 and the historical check have the same gap.
- **Fix (choose one before freezing):**
  - (a) Use max(V(A), V(B4)) in F2: margin ≥ $5,000 at 5 bps, and ≥ at 10 bps. Do the same in N2 with net, and in the historical check (≥ max − $10,000). B4 already runs at every cost in controls and validation (role `incumbent`) and in the historical check, so each change is one line.
  - (b) State explicitly in §13.3 and §14.2 that A (B5) is the only benchmark, because the brief's §7 table names it "Original benchmark (with B4 … also reported)". Also report V(X) − V(B4) per fold and disclose any fold where it is negative.
- A gate cannot be changed after outcomes, so this has to be decided now.

### 2. MINOR: the same-minute latency assumption governs most real-data switches

- **Where:** §5.3.4 (`PROTOCOL.md:178`) states the assumption.
- **The point:** the assumption is not an edge case.
  - For two symbols that both trade in minute T, the sale (the incumbent's first trade at or after T) and the replacement's fill (its first trade at or after T) land in the same minute.
  - Both are modelled at that minute's opens.
  - So on minute data, nearly every executed continuous-session switch between liquid ETFs should rely on it. This is my expectation; I did not measure it, since market data were off-limits.
- **Conversely:** an overnight switch between two symbols that both print in the opening minute always aborts.
- **The disposition's reason for omitting P1-strict** ("conservative at auctions", disposition #3) covers auctions only. A strict variant would break "funded lot = virtual trade", so I do not ask for one.
- **Fix:**
  - Add both points to the §0 disclosures.
  - Report descriptively the share of executed switches whose replacement `entryTime === executionTime`.

### 3. MINOR: the gate inputs V and windowed DD are replay-only

- **Where:**
  - The engine cross-checks compare whole-run net and lots (`walkforward.ts:175`), and net, lots and minute DD (`final.ts:279–283`).
  - F1, F2 (5 and 10 bps) and the historical V and DD come only from the replay's windowed figures.
  - §14.4 says "the derived engine must reproduce the replay's figures".
- **Risk:** low. Parity checks (iii) and (v) cover the marks.
- **Fix:** recompute V at 5 and 10 bps from the engine's `daily[boundary|end].strategyMark`, minus the open lot's exit friction at each end, and require equality with `validation.net` / `window(n).net`. Also compare the windowed daily DD.

### 4. MINOR: controls can seal a fold without D_Rk

- **Where:** `controls.ts:58` silently drops D-Rk when `JOINT.json` is missing.
- **Scenario:**
  - The controls run before one ranking's joint finishes and are sealed without D-R2.
  - Later, `runPicks` recomputes the configurations (now including D-R2) and throws at `walkforward.ts:52`.
  - The fold is blocked for good, because the controls are write-once.
- **Fix:** `runControls` should refuse unless `readJoint` verifies for both rankings.

### 5. MINOR: the historical door is not tied to the nominee

- **Where:** `historicalUniverse` (`data.ts:283`) checks only that a nominee exists.
- **Scenario:** once a nominee exists, any pool whose status is not `research-only` reaches `all` (2024–2026) through `cli.ts:190–198`.
  - The code only ever writes `research-only`.
  - But someone could hand-edit a pool's status and recompute its content hash.
- **Fix:** restrict the door's members to the nominee ∪ B5 ∪ B4 (plus VOOG/VGT for portfolio runs). Before `HISTORICAL_CHECK.json` exists, allow only `final.ts`'s call.

### 6. MINOR: protocol wording

- `PROTOCOL.md:175`: "after that bar's virtual exits" — add "(except an own exit priced inside that bar, §5.3.5)".
- `:187`: "at a price at or before the sale's" should read "at an event at or before the sale's".
- §5.3.5 should say:
  - the auction test is decided from bar timestamps and availability only (no price);
  - an incumbent's first bar in the *decision's* session counts as continuous trading.
  - In my probes these are the superseded cases where the own exit is at the incumbent's bar 0 and the replacement fills in the same minute.

### 7. MINOR: stale comments

- `engine.ts:16–20`: describes the superseded case without the intrabar and auction rules, and says "never a chain" (§5.3.6 now allows two-minute chains).
- `allocation.ts:10–13`: no auction rule.
- `context.ts:148`: "immaterial (window, ranking)" — materiality is now decided per window.

### 8. MINOR: test gaps for the new rules

Add as tests (all pass engine = replay in my `targeted.ts`):
- An own exit at the closing print, with the replacement at the closing print (abort).
- The same, with the replacement having no closing print (superseded; the replacement is bought at the next open).
- An intrabar stop at a later session's opening trade:
  - replacement at the same print: abort, then the own stop closes the lot;
  - replacement at a strictly later bar: the switch executes at the open;
  - both first bars at 9:32: abort.

### Answers to the specific questions

- **Is the auction rule causal?**
  - Yes. The engine (`engine.ts:1495–1509`) uses `order.fillBar`, which comes from `firstTradeAfterDecision` on bar times and closing-print availability.
  - The replay (`replay.ts:380–396`) uses the trace's entry index and bar.
  - Both run before any price is read (`engine.ts:1448` before `liquidationOf`; `replay.ts:405` before `liquidation`).
- **Can the pool end up with a sold incumbent and no replacement?** Never through the preemption sale itself. It happens only when:
  - the incumbent's own exit lands on the same auction print, which the text allows ("the incumbent's own exit, if any, still happens"); or
  - a replacement reservation is still open when the data end.
- **Is a closing-print sale with the replacement at the next open executable?** Yes.
  - The fill-time test is monotone in price, so it is exactly a limit-on-close sell at breakeven.
  - The buy is placed after the closing fill is known.
  - The same holds for a limit-on-open sale at a later session's opening trade with a strictly later replacement fill.
  - The only remaining non-strict case is finding 2.
- **Is the intrabar rule consistent?** Yes, in the engine (`engine.ts:1539–1553`), the replay (`replay.ts:452–462`) and the diagnostic's `holderExitsFirst` (`replay.ts:526–531`).
  - It is causal: the sale at the bar's open needs no knowledge of the bar's low.
- **Is any gate trivially passable or impossible?** None found. Apart from finding 1, the gates match §13–§14 and `context.ts`.

## (c) Probes

All are in `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/9d1b06b5-6c64-4f8c-b4ce-597029e85d41/scratchpad/confirm/`, use synthetic fixtures only, and were run from the repository root with Node v24.21.0.

**1. `fuzz-rules3.ts`: engine (fixed) vs replay under P0, P0R, P1, P1-B250 and P1-B500, with an auction-heavy generator.**
- Runs: seeds/configs `1 150 0.7`, `11 300 0.9 0.5 0.45`, `12 300 0.5 0.3 0.45`, `13 300 0.95 0.95 0.44`, `14 300 0.3 0.6 0.46` and `15 400 1.0 0.2 0.45`. That is 1,750 universes and 8,750 policy runs, with **0 differences** and no one-lot overlaps.
- P1 coverage:

| Case | Count |
|---|---:|
| Executed | 1,414 |
| — with an intrabar stop at the sale bar | 89 |
| — sold at the closing print | 47 |
| — sold at the next session's opening trade | 23 |
| — replacement bought in the same minute | 246 |
| Aborted: sale and replacement fill on the same auction print | 244 |
| Aborted: own exit and replacement fill on the same auction print (all at the opening trade) | 29 |
| Superseded | 32 |
| Aborted: replacement order filled first | 2,211 |
| Aborted: fill-time net below the threshold | 7 |

- No executed switch had the replacement filling at the same auction print.

```ts
// Engine (fixed) vs replay under P1/B250/B500/P0R/P0 on random synthetic universes built to hit the new rules:
// opening-auction coincidences (bar 0 at 9:30 for most sessions), intrabar stop-level exits (open above, close below),
// closing-print-only tails, last-minute decisions. Coverage is tallied per outcome/reason class.
// Usage (repo root): node --experimental-transform-types fuzz-rules3.ts <seed> <runs> <liquidShare> <closingShare> <drift>
import { compareValues, outputsOf } from '/Users/chad/development/personal/margin-trading/src/portfolio-aware-d1/compare.ts';
import type { PolicyKey } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/allocation.ts';
import { type PRunResult, runPAllocator } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/engine.ts';
import { replayPreemptive } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/replay.ts';
import { type FixtureRun, type SessionSpec, allocationFor, bookOf, configOf, replayBooksOf, weekdayUniverse }
  from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/tests/fixtures.ts';

let seed = Number(process.argv[2] ?? 1);
const runs = Number(process.argv[3] ?? 200);
const liquidShare = Number(process.argv[4] ?? 0.7);
const closingShare = Number(process.argv[5] ?? 0.9);
const drift = Number(process.argv[6] ?? 0.47);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

const sessionsOf = (count: number): SessionSpec[] => {
  const out: SessionSpec[] = []; let p = 100;
  while (out.length < count) {
    const n = 2 + Math.floor(rnd() * 8);
    const liquid = rnd() < liquidShare;
    const slots: number[] = [];
    let slot = liquid ? 0 : Math.floor(rnd() * 3);
    const tail = rnd() < 0.25; // bars run to the last minute (decisions at 16:00 -> carried)
    for (let i = 0; i < n && slot <= 389; i++) { slots.push(slot); slot += rnd() < 0.5 ? 1 : 1 + Math.floor(rnd() * 60); }
    if (tail && slots.at(-1)! < 389) { slots.push(389); }
    const closes: number[] = []; const opens: (number | undefined)[] = [];
    for (let i = 0; i < slots.length; i++) {
      const shock = rnd() < 0.15 ? (rnd() - 0.6) * 0.16 : (rnd() - drift) * 0.03;
      if (i === 0 && rnd() < 0.3) { p *= 1 + (rnd() - 0.5) * 0.12; opens.push(Math.round(p * 100) / 100); }
      else if (i > 0 && rnd() < 0.35) opens.push(Math.round(p * (1 + rnd() * 0.02) * 100) / 100); // opens above -> intrabar stops
      else opens.push(undefined);
      p = Math.max(5, p * (1 + shock)); closes.push(Math.round(p * 100) / 100);
    }
    out.push({ closes, slots, opens, closingPrint: rnd() < closingShare });
  }
  return out;
};

const policies: PolicyKey[] = ['P0', 'P0R', 'P1', 'P1-B250', 'P1-B500'];
const tally: Record<string, number> = {};
const bump = (k: string) => { tally[k] = (tally[k] ?? 0) + 1; };
let failures = 0;
for (let r = 0; r < runs; r++) {
  const symbols = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 4)).sort();
  const sessions = 25 + Math.floor(rnd() * 25);
  const specs: Record<string, SessionSpec[]> = {};
  for (const symbol of symbols) specs[symbol] = sessionsOf(sessions);
  const universe = weekdayUniverse(specs);
  const order = [...symbols].sort(() => rnd() - 0.5);
  const costBps = pick([0, 2, 5, 10]); const rate = pick([0, 0.11]);
  const books = Object.fromEntries(symbols.map((symbol) => [symbol, bookOf(symbol, {
    targetPercentChange: pick([30, 50, 80, 100]), trailingBuyPercentage: pick([5, 10, 20]),
    trailingStopPercentage: pick([5, 10, 10, 20, 30]), maximumHoldDays: pick([1, 2, 3, 5, 30]),
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
    for (let i = 1; i < full.lots.length; i++) if (full.lots[i - 1]!.exitTime > full.lots[i]!.entryTime) diffs.push(`overlap lots ${i}`);
    if (diffs.length > 0) { failures++; console.log(`run ${r} ${policy}`, diffs.slice(0, 6)); }
    if (policy !== 'P1' && policy !== 'P1-B500') continue;
    for (const rec of full.preemptions) {
      const src = full.trades.find((t) => t.symbol === rec.sourceSymbol && t.id === rec.sourceTradeId)!;
      const tgt = full.trades.find((t) => t.symbol === rec.targetSymbol && t.id === rec.targetTradeId)!;
      const intrabar = src.exitExecution === 'stop level' && src.exitIndex === rec.executionIndex && src.exitBar === rec.executionBar;
      const cls = /sold at/.test(rec.reason) ? 'executed' : /exited first/.test(rec.reason) ? 'superseded'
        : /own exit and .* same auction/.test(rec.reason) ? 'abort:own-exit-auction' : /sale and .* same auction/.test(rec.reason) ? 'abort:sale-auction'
        : /filled before/.test(rec.reason) ? 'abort:fill-first' : /liquidation net at the fill/.test(rec.reason) ? 'abort:net' : /data end/.test(rec.reason) ? 'abort:end' : 'other:' + rec.reason;
      const srcBars = universe.instruments[rec.sourceSymbol]!.ds.sBarCount;
      bump(`${policy} ${cls}${intrabar ? ' [intrabar stop]' : ''}${cls.startsWith('abort:own') ? ' exit=' + src.exitExecution + (src.exitBar >= srcBars[src.exitIndex]! ? '@close' : '@bar' + src.exitBar) : ''}`);
      if (cls === 'executed') {
        const atClose = rec.executionBar >= universe.instruments[rec.sourceSymbol]!.ds.sBarCount[rec.executionIndex]!;
        const carried = rec.executionIndex > rec.decisionIndex;
        const repl = full.lots.find((l) => l.id === rec.replacementLotId);
        const same = repl && repl.entryTime === rec.executionTime;
        bump(`${policy} executed ${atClose ? 'close-print' : carried ? 'next-session-open' : 'continuous'} repl:${repl ? (same ? 'same-time' : 'later') : 'none'}`);
        if (same && (atClose || (carried && rec.executionBar === 0 && tgt.entryBar === 0))) { console.log('AUCTION-SAME EXECUTED', r, policy, rec); failures++; }
      }
      if (cls === 'superseded') {
        const repl = full.lots.find((l) => l.id === rec.replacementLotId);
        bump(`${policy} superseded by ${src.exitExecution} repl:${repl ? (repl.entryTime === src.exitTime ? "same-time" : "later") : "none"} ${src.exitIndex > rec.decisionIndex ? "later-session" : "decision-session"} exitBar${src.exitBar} replBar${repl ? repl.entryBar : -1}`);
      }
    }
  }
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(tally).sort()), null, 1));
console.log(`failures ${failures}`);
```

**2. `targeted.ts`: the requested counterexamples, built by hand.** All five showed parity OK, and the diagnostic agreed with P1:
- own maximum-hold exit at the closing print, replacement at the closing print → aborted (own exit and fill on the same auction print);
- the same without the replacement's closing print → superseded; the replacement is bought at the next session's 9:30;
- intrabar stop at a carried order's opening trade, replacement first bar at 9:30 → aborted before the sale; the own stop closes at 104.50;
- the same with the replacement's first bar at 9:35 → executed at the 106 open; the replacement is bought at 9:35;
- both first bars at 9:32 → aborted.

```ts
import { compareValues, outputsOf } from '/Users/chad/development/personal/margin-trading/src/portfolio-aware-d1/compare.ts';
import { type PRunResult, runPAllocator } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/engine.ts';
import { replayPreemptive } from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/replay.ts';
import { type FixtureRun, allocationFor, bookOf, configOf, dipTo, flat, flats, replayBooksOf, weekdayUniverse }
  from '/Users/chad/development/personal/margin-trading/src/d1-ranked-preemption/tests/fixtures.ts';
import type { NUniverse } from '/Users/chad/development/personal/margin-trading/src/portfolio-aware-d1/nbook/engine.ts';

const check = (universe: NUniverse, spec: FixtureRun, label: string) => {
  const full = runPAllocator(universe, configOf(spec));
  const rp = (allocation: ReturnType<typeof allocationFor>, diagnose?: { rankingId: string; order: string[] }[]) =>
    replayPreemptive(replayBooksOf(universe, spec), { symbols: spec.symbols, startIndex: 0, endIndex: universe.sessionCount - 1,
      principal: 100000, rate: spec.rate ?? 0.11, costBps: spec.costBps ?? 0, stopSlippageBps: 0, detail: true, allocation, ...(diagnose ? { diagnose } : {}) });
  const fast = rp(allocationFor(spec));
  const { preemptions, declines, allocationKey, priorityOrder, ...rest } = outputsOf(full) as PRunResult;
  void allocationKey; void priorityOrder;
  const diffs = [...compareValues(rest, fast.full), ...compareValues(preemptions.map((x) => ({ ...x, targetVirtualState: '' })), fast.preemptions), ...compareValues(declines, fast.declines)];
  const diag = rp(allocationFor({ ...spec, policy: 'P0R' }), [{ rankingId: 'R', order: spec.order! }]);
  const ov = diag.overlaps.find((o) => o.higher.R && o.estimateNet >= 0);
  const p = full.preemptions[0];
  console.log(`${label}: parity ${diffs.length ? 'DIFF ' + diffs.slice(0, 3).join('; ') : 'OK'}; outcome ${p?.outcome} (${p?.reason}); lots ${full.lots.map((l) => `${l.symbol}@${l.entryRawPrice}->${l.exitReason}@${l.exitRawPrice.toFixed(2)} t${(l.entryTime % 86400) / 60 - 870}-${(l.exitTime % 86400) / 60 - 870}`).join(' | ')}; diag actionable ${ov?.actionable.R} sameAuction ${ov?.sameAuctionPrint} holderFirst ${ov?.holderExitsFirst}`);
  if (ov && p && ov.decisionTime === p.decisionTime && ov.actionable.R !== (p.outcome === 'executed')) console.log('  !! diagnostic disagrees with P1');
  return full;
};
const p1 = (extra: Partial<FixtureRun> = {}): FixtureRun => ({ symbols: ['VGT', 'XRT'], policy: 'P1', order: ['VGT', 'XRT'], rate: 0, costBps: 0, ...extra });

// XRT bought s3 @100; s4 one bar (open 99.9 close 100.5): maximum hold (1 day) due -> own exit at the closing print.
// VGT triggers at its last s4 bar: its fill is the s4 closing print, or (no closing print) s5's open.
for (const vgtClose of [true, false]) {
  const universe = weekdayUniverse({
    XRT: [...flats(3, 112), dipTo(112, 100), { closes: [100.5], opens: [99.9], slots: [0] }, ...flats(3, 100.5)],
    VGT: [...flats(4, 100), { closes: [100, 89, 88, 89], slots: [0, 100, 101, 102], closingPrint: vgtClose }, ...flats(3, 89)]
  });
  check(universe, p1({ books: { XRT: bookOf('XRT', { maximumHoldDays: 1 }), VGT: bookOf('VGT') } }), `own max-hold exit @close, VGT closing print ${vgtClose}`);
}
// Intrabar stop at the opening trade of a later session (XRT stop 104.5 active; VGT decides at 16:00 on s5 -> carried;
// XRT's s6 bar 0 opens 106, closes 104). VGT's s6 first bar at slot 0 (same auction) or slot 5.
for (const vgtSlot of [0, 5]) {
  const universe = weekdayUniverse({
    XRT: [...flats(3, 112), dipTo(112, 100), flat(110), flat(110), { closes: [104, 104, 104], opens: [106] }, flat(104)],
    VGT: [...flats(5, 100), { closes: [100, 89, 88, 89], slots: [0, 386, 387, 389] }, { closes: [89, 89, 89], slots: [vgtSlot, vgtSlot + 1, vgtSlot + 2] }, flat(89)]
  });
  check(universe, p1(), `intrabar stop at s6 opening trade, VGT first bar slot ${vgtSlot}`);
}
{ // both first s6 bars at 9:32 (opening trades of a session after the decision's, same minute): abort
  const universe = weekdayUniverse({
    XRT: [...flats(3, 112), dipTo(112, 100), flat(110), flat(110), { closes: [104, 104, 104], opens: [106], slots: [2, 3, 4] }, flat(104)],
    VGT: [...flats(5, 100), { closes: [100, 89, 88, 89], slots: [0, 386, 387, 389] }, { closes: [89, 89, 89], slots: [2, 3, 4] }, flat(89)]
  });
  check(universe, p1(), 'intrabar stop, both first bars at 9:32');
}
```

**3. `diag-fuzz.ts`: P0R + `diagnose` against P1's first preemption, with the same generator.**
- Runs: `1 600 0.9 0.4`, `2 600 0.5 0.9`, `3 600 1.0 0.2`.
- Result: 1,351 first preemptions compared (including 34 sale-auction aborts), **0 mismatches** (actionable ⇔ executed, same decision).
- Code: the `sessionsOf` and book generator of probe 1, plus:

```ts
const spec: FixtureRun = { symbols, policy: 'P1', order, costBps, rate, books };
const first = runPAllocator(universe, configOf(spec)).preemptions[0];
const diag = replayPreemptive(replayBooksOf(universe, spec), { symbols, startIndex: 0, endIndex: universe.sessionCount - 1,
  principal: 100000, rate, costBps, stopSlippageBps: 0, detail: false, allocation: allocationFor({ ...spec, policy: 'P0R' }),
  diagnose: [{ rankingId: 'R', order }] });
const q = diag.overlaps.find((o) => o.higher.R && o.estimateNet >= 0);
// fail if Boolean(q) !== Boolean(first), or q.decisionTime !== first.decisionTime, or q.actionable.R !== (first.outcome === 'executed')
```

**4. `portfolio-rules-fuzz.ts`: portfolio-mode P1 against fixed-mode P1.**
- Built from the earlier reviewer's `review/portfolio-fuzz.ts`, with these changes:
  - bar 0 at 9:30 in 85% of sessions;
  - a 15:59 bar in 25% of sessions;
  - bar opens up to 2% above the previous close, which creates stop-level exits;
  - closing prints in 60% of sessions;
  - 5–20% stops.
- Result: seeds 5 and 6, 300 universes each, 1,200 runs, **0 failures**.
  - The funded sequence equals fixed mode whenever no margin refusal is recorded.
  - Booked net = tested net for every executed switch.
  - Coverage includes 142 sale-auction aborts and 46 own-exit-auction aborts.

## (d) What I verified

- **Tests and types:** 35/35 synthetic tests pass (engine 18, scenarios 14, leakage 2, pipeline 1). `tsc --noEmit` reports 0 errors.
- **P0 is byte-for-byte the frozen behaviour** (body diff of `runNAllocator` → `runPAllocator`). The 6 removed lines are:
  - the signature;
  - the occupancy label (plus a `pending` term that is undefined under P0);
  - `book.commit(…, record.outcome)`, where `record.outcome` is set to `result.grant ? 'granted' : 'refused'` beforehand;
  - the return object (extra fields only);
  - a dropped re-export.
  - Every added branch is guarded by `policy.preemption`, `policy.rankedTies`, `pending` or the empty `replacementOf` map. That includes the new intrabar branch in `closeVirtual` and the abort in `fillVirtual`.
  - P0R/P1 sorting runs only under `rankedTies`.
  - The frozen engine and replay files are unchanged in git.
- **Engine = replay under P1** (probes 1–2), including the cases you named:
  - an auction print at a carried order's opening trade;
  - an intrabar stop with the replacement filling in the same minute or later;
  - a superseded own exit at the closing print with the replacement at the closing print.
  - The engine compares times where the replay compares a close flag. These are equivalent because `groupMarketSessions` keeps every bar before `closeTime`, and the 16:00 minute becomes the closing print (`src/lib/session.ts`).
- **The earlier MATERIAL findings are fixed:**
  - #1: materiality is one decision per window, and both branches get the same share (`diagnostic.ts`, `joint.ts:362/371`).
  - #2: the intrabar rule is in all three places listed in (b).
  - #3: the auction rule is in both implementations and the diagnostic.
  - #4: F2 has the $5,000 margin and the 10 bps leg (`walkforward.ts:231–232`).
  - #5: the doors enforce the chronology, and every CLI load is routed through `inspectionUniverse`, `benchmarkUniverse` or `historicalUniverse` (`cli.ts:116–234`). `B5 --policy P1` uses the inspection door with the chronology. `root` bypasses appear only in tests. The benchmark exception refuses once the protocol is frozen.
- **Dispositions spot-checked and true:**
  - #6: parity runs P0–P1-B500 with a deterministic coverage loop on fold-a data.
  - #7: V subtracts the open lot's exit friction at both ends (`evaluate.ts:433–437`, `replay.ts:940`).
  - #8: the historical check has an engine cross-check (whole-run figures; see finding 3).
  - #10: N3 uses 64 fresh draws (stage `nomination:final:<ranking>`).
  - #14: the constants moved into `context.ts`; `incumbentMutants` is asserted (`joint.ts:328`).
  - #15/#16: `assertEnvironment` works as stated; both freezes refuse test mode.
  - #19: N4 uses A − 0.1·|A|.
  - #20: rank scores are in the preemption records.
  - #21: regimes are keyed G1–G13.
  - #24: phenotype JSONs record the universe record's hash.
  - Engine review #1: the `windowStarts` guard.
  - Engine review #3: `releasedPrincipal` is set on supersession.
- **Every protocol constant matches `context.ts`.** I checked the tiers, Stage A, screening, the diagnostic (3/5/0.25), Stage D, J_pool, the gates (F: $35,000 / 3 lots / $5,000; N: $25,000 / 0.75 / 35% / 0.1 / 12 / 4 / 0.8 / 0.5; historical $10,000), parity 40/200/20/20/20, the benchmark's 1.5 and +25%, Node v24.21.0, step units, and the 4/5/7 trade floors.
- **Freeze and git state:** the freeze binds this review file (`confirmatory-review.md`) and refuses if any outcome-stage directory exists (none does yet). `git status` shows only `package.json` (one added script; the bound `pools` script value is unchanged) plus the two new study directories.
