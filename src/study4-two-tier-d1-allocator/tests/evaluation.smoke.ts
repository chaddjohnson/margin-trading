// A synthetic end-to-end run of the evaluation core (evaluateWorld): synthetic 2016–2023 weekday markets named like the
// B5 members and a few others, hand-made fold selections and stage records. Mechanics only (no market data); a plain
// script: node --experimental-transform-types src/study4-two-tier-d1-allocator/tests/evaluation.smoke.ts
import { syntheticMarket } from '../../study3-vgt-momentum-stage1b/tests/synthetic.ts';
import { policyOf } from '../allocator.ts';
import { deepBroadBand, loadB5, neighbourhoodBounds, shallowBand, shallowBounds, volatilityOf } from '../books.ts';
import { foldKeys } from '../context.ts';
import { type World, evaluateWorld, stagesEvaluated } from '../evaluation.ts';
import { deepBook, shallowBook } from '../search4d.ts';
import { describeGenome } from '../selection.ts';
import { type Genome, randomGrid } from '../space.ts';
import { Rng } from '../../optimizer/rng.ts';

const symbols = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX', 'XLE', 'SMH', 'IWM'];
const datasets = Object.fromEntries(
  symbols.map((symbol, i) => {
    const ds = syntheticMarket(2012, 700 + i, 30);

    ds.id = `smoke-${symbol}`;
    return [symbol, ds];
  })
);
const dates = datasets.VGT!.dates;
const yearEnd = Object.fromEntries(
  ['2019', '2020', '2021', '2022', '2023'].map((year) => [
    year,
    Math.max(...dates.map((d, i) => (d.startsWith(year) ? i : -1)))
  ])
);
const b5 = await loadB5();
const world: World = {
  datasets,
  dates,
  armStart: dates.findIndex((d) => d >= '2017-06-15'),
  endIndex: dates.length - 1,
  yearEnd,
  b5: b5.books
};
const rng = new Rng([8, 8, 8, 8]);
const genome = (fold: string): Genome => {
  const devEnd = yearEnd[String(Number(`20${fold.slice(1)}`) - 1)]!;
  const symbol = ['XLE', 'SMH', 'IWM', 'VGT'][rng.int(4)]!;
  const sigma = volatilityOf(datasets[symbol]!, devEnd);
  const band = shallowBand(sigma, b5.books.find((b) => b.symbol === symbol)?.grid.targetPercentChange);

  // the 4D-B and 4D-C deep-tier shapes as well: a neighbourhood-reoptimized B5 book and a broad deep book (amendment A5)
  const rho = Math.min(
    ...b5.books.map((b) => b.grid.targetPercentChange / 1000 / volatilityOf(datasets[b.symbol]!, devEnd))
  );
  const deep = b5.books.map((b, i) =>
    i === 0 && rng.next() < 0.5
      ? deepBook(
          b.symbol,
          randomGrid(rng, neighbourhoodBounds(b.grid, volatilityOf(datasets[b.symbol]!, devEnd), rho)),
          'smoke',
          'neighbourhood'
        )
      : { ...b }
  );
  const broad = deepBroadBand(volatilityOf(datasets.SMH!, devEnd), rho);

  if (!broad.empty && rng.next() < 0.5) {
    deep.push(deepBook('SMH', randomGrid(rng, shallowBounds(broad)), 'smoke', 'broad'));
  }

  return {
    deep,
    shallow: band.empty ? [] : [shallowBook(symbol, randomGrid(rng, shallowBounds(band)), 'smoke')],
    policy: policyOf((['P0', 'P1', 'P3', 'P4'] as const)[rng.int(4)]!, { budget: 1000, deadline: 1 })
  };
};
const describe = (g: Genome) => ({ ...describeGenome(g), evaluation: { delta: 1000 } });
const selections = Object.fromEntries(
  foldKeys.map((fold) => [
    fold,
    {
      window: fold,
      picks: Object.fromEntries(
        stagesEvaluated.map((stage) => [
          stage,
          rng.next() < 0.2
            ? { pick: null, noFill: true, sRaw: null, sRisk: null }
            : {
                pick: describe(genome(fold)),
                noFill: false,
                sRaw: describe(genome(fold)),
                sRisk: describe(genome(fold))
              }
        ])
      ),
      sa: describeGenome(genome(fold)),
      b5Books: b5.books
    }
  ])
) as never;
const readStage = (fold: string) => ({
  skill: {
    best: Array.from({ length: 5 }, () => ({ ...describeGenome(genome(fold)), delta: 100 * rng.int(100) })),
    random: Array.from({ length: 5 }, () => ({ ...describeGenome(genome(fold)), delta: 0 }))
  },
  nullPicks: Array.from({ length: 100 }, () => (rng.next() < 0.5 ? describeGenome(genome(fold)) : null))
});
const modes = new Set(
  Object.values(selections as Record<string, { picks: Record<string, { pick: Genome | null }> }>).flatMap((sel) =>
    Object.values(sel.picks).flatMap((entry) => (entry.pick ? entry.pick.deep.map((b) => b.deepMode ?? b.origin) : []))
  )
);

if (!modes.has('neighbourhood') || !modes.has('broad')) {
  throw new Error(`the smoke picks lack a neighbourhood or broad deep book: ${[...modes].join(', ')}`);
}

const t0 = Date.now();
const { rubric, referenceChecks, out } = await evaluateWorld(world, selections, readStage as never, (line) =>
  console.log(line)
);

console.log(
  'reference checks',
  referenceChecks.length,
  'all pass',
  referenceChecks.every((c) => c.pass),
  referenceChecks.filter((c) => !c.pass).map((c) => c.stage + ' ' + c.mode + ' ' + c.detail.slice(0, 200))
);
console.log('labels', JSON.stringify(Object.fromEntries(Object.entries(rubric).map(([k, v]) => [k, v.label]))));
console.log('criteria 4D-A', JSON.stringify(rubric['4D-A']!.criteria));
console.log('stages', Object.keys(out).length, 'seconds', ((Date.now() - t0) / 1000).toFixed(0));

// the per-trade preservation listing agrees with the frozen counters
for (const [stage, value] of Object.entries(out)) {
  const c = (value as { chained: { preservation: Record<string, number>; b5Trades: { status: string }[] } }).chained;

  for (const status of ['exact', 'delayed', 'altered', 'missed']) {
    if (c.b5Trades.filter((t) => t.status === status).length !== c.preservation[status]) {
      throw new Error(`${stage}: b5Trades ${status} disagrees with preservation`);
    }
  }
}

console.log('b5Trades listing agrees with the preservation counters');

// optional: write an evaluation-shaped record for exercising scripts/report.py on synthetic results
if (process.env.STUDY4_SMOKE_OUT) {
  const { b5Run, b5Years } = await evaluateWorld(world, selections, readStage as never, () => {});
  const fs = await import('fs');

  fs.writeFileSync(
    process.env.STUDY4_SMOKE_OUT,
    JSON.stringify({
      results: out,
      rubric,
      b5: {
        years: b5Years,
        minuteDD: b5Run.segments[0]!.minute,
        dailyDD: b5Run.segments[0]!.daily,
        lots: b5Run.lots
          .filter((lot) => lot.entryIndex > yearEnd['2019']!)
          .map((lot) => ({
            ...lot,
            entryDate: dates[lot.entryIndex],
            exitDate: lot.exitIndex >= 0 ? dates[lot.exitIndex] : 'open'
          }))
      },
      b4: { years: b5Years },
      b1: { years: b5Years }
    })
  );
}
