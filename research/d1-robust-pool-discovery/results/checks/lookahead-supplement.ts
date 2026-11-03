// Supplementary lookahead check on real training traces (outside src/, so the frozen code manifest is untouched):
// for 12 random 6-book pools, alter the exit price and time of the MIDDLE funded lot and require every funding decision
// before that exit to be unchanged. Records counts only.
const R = '/Users/chad/development/personal/margin-trading/src';
const { trainingUniverse, eligibleSymbols } = await import(`${R}/d1-robust/data.ts`);
const { RobustEvaluator } = await import(`${R}/d1-robust/evaluator.ts`);
const { GenomeSpace, Library } = await import(`${R}/d1-robust/genome.ts`);
const { sobolLibrary } = await import(`${R}/d1-robust/library.ts`);
const { replayFixedPool } = await import(`${R}/portfolio-aware-d1/replay.ts`);
const { Rng } = await import(`${R}/optimizer/rng.ts`);
const fs = (await import('/Users/chad/development/personal/margin-trading/node_modules/fs-extra/lib/index.js')).default;

process.chdir('/Users/chad/development/personal/margin-trading');
const universe = await eligibleSymbols();
const loaded = await trainingUniverse('final', { symbols: universe });
const evaluator = await RobustEvaluator.create(loaded, 'final', 0);
const space = new GenomeSpace(universe, new Library(sobolLibrary().vectors));
const rng = Rng.from('robust-d1', 'parity', 'lookahead-supplement');
const rows = [];

for (let attempt = 0; attempt < 60 && rows.length < 12; attempt++) {
  const base = evaluator.replayDetail(space.booksOf(space.uniform(rng, 6, 6)), 5);
  const closed = base.lots.filter((lot) => lot.exitIndex >= 0);

  if (closed.length < 6) continue;

  const target = closed[closed.length >> 1];
  const owner = base.books.find((item) => item.symbol === target.symbol);
  const trade = owner.trace.trades[target.tradeId - 1];
  const config = { symbols: base.books.map((b) => b.symbol), startIndex: evaluator.window.startIndex, endIndex: evaluator.window.endIndex, principal: 100000, rate: 0.11, costBps: 5, stopSlippageBps: 0, detail: true };
  const altered = (change) => replayFixedPool(base.books.map((item) => item === owner ? { ...item, trace: { ...item.trace, trades: item.trace.trades.map((o) => { if (o !== trade) return o; const c = { ...o }; change(c); return c; }) } } : item), config);
  const before = (r) => r.full.signals.filter((s) => s.decisionTime < trade.exitTime).map((s) => `${s.symbol}@${s.decisionTime}:${s.outcome}`).join('|');
  const ref = before(replayFixedPool(base.books, config));
  const a = before(altered((c) => { c.exitRawPrice *= 0.5; c.net -= 50000; }));
  const b = before(altered((c) => { c.exitIndex = Math.min(c.exitIndex + 3, evaluator.window.endIndex); }));

  rows.push({ pool: attempt, lots: base.lots.length, earlierDecisions: ref.split('|').length, equal: a === ref && b === ref });
}

await evaluator.close();
await fs.outputJson('research/d1-robust-pool-discovery/results/parity/lookahead-supplement.json', { generatedAt: new Date().toISOString(), note: 'supplementary P3 on real training traces: the middle funded lot of each 6-book pool altered (exit price halved; exit 3 sessions later)', rows, allEqual: rows.every((r) => r.equal) }, { spaces: 1 });
console.log(JSON.stringify({ pools: rows.length, allEqual: rows.every((r) => r.equal), earlierDecisions: rows.map((r) => r.earlierDecisions) }));
