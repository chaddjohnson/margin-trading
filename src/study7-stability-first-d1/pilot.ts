// The pre-freeze pilot (PROTOCOL.md §8.1): training data only (the `pilot` door, training partition, last session
// 2021-12-31). It measures throughput and memory, and the marginal precision of neighbourhood fitness: for random
// plausible centres of Track G, VG and VXR, how well 16- and 32-point joint N1 neighbourhoods rank candidates relative
// to a 128-point neighbourhood (Spearman), and the replicate spread of the share below $35,000. Centres come from a
// pilot-only seed stream and are never candidates. The frozen controls' DEV centres are recorded for the feasibility
// of the activity floors. Nothing here chooses an objective, a window or a ranking.
import { Rng } from '../optimizer/rng.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { eligibility, frozenGrids, frozenPools, gdxControls, resultFile, seedOf } from './context.ts';
import { openDoor } from './data.ts';
import { familyDesign, uniquePoints } from './designs.ts';
import { type Books, Evaluator, Lab, PointCache, type PointRecord, baseSettings } from './evaluate.ts';
import { log, nowIso, writeSealed } from './records.ts';
import { sobolGrids } from './space.ts';
import { robustProfit, spearman, summarize } from './stats.ts';

const booksOf = (symbols: readonly string[]): Books =>
  Object.fromEntries(symbols.map((symbol) => [symbol, { ...frozenGrids[symbol as keyof typeof frozenGrids] }]));

export const runPilot = async () => {
  const started = Date.now();
  const door = await openDoor('pilot', ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'], 'pre-freeze pilot (timing, precision)');
  const loadMs = Date.now() - started;
  const ev = new Evaluator(door);
  const lab = new Lab(ev, PointCache.memory(door));
  const years = ev.yearsOfRun();
  const rssAfterLoad = process.memoryUsage().rss;

  // 1. timing: trace builds per symbol, replays per pool size
  const timing: Record<string, number> = {};

  for (const symbol of ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']) {
    const { grids } = sobolGrids(40, ['pilot', 'timing', symbol]);
    const t0 = performance.now();

    for (const grid of grids) ev.trace(symbol, grid, baseSettings);

    timing[`trace_${symbol}_ms`] = (performance.now() - t0) / grids.length;
  }

  for (const [key, symbols] of Object.entries(frozenPools)) {
    const books = booksOf(symbols);

    ev.point(books);

    const t0 = performance.now();

    for (let i = 0; i < 40; i++) ev.point(books);

    timing[`replay_${key}_cachedTraces_ms`] = (performance.now() - t0) / 40;
  }

  // 2. frozen controls' DEV centres (feasibility of the floors)
  const controls: Record<string, PointRecord> = {};

  for (const [key, symbols] of Object.entries(frozenPools)) controls[key] = lab.point(booksOf(symbols));
  for (const [key, control] of Object.entries(gdxControls)) controls[key] = lab.point({ GDX: control.grid });

  // 3. precision: random plausible centres per track
  const precision: Record<string, unknown> = {};
  const plausibleStandalone = (record: PointRecord) => record.dd < eligibility.ceiling && record.net > 0 && record.lots >= 2;

  for (const [track, symbols] of [
    ['G', ['GDX']],
    ['VG', ['VGT', 'GDX']],
    ['VXR', ['VGT', 'XBI', 'XRT']]
  ] as const) {
    const pools: Record<string, Grid[]> = {};

    for (const symbol of symbols) {
      pools[symbol] = sobolGrids(512, ['pilot', 'precision', track, symbol]).grids.filter((grid) =>
        plausibleStandalone(lab.point({ [symbol]: grid }))
      );
    }

    const pick = Rng.from(...seedOf('pilot', 'combos', track));

    const centres: Books[] = [];
    let tries = 0;

    while (centres.length < 48 && tries < 20000) {
      tries++;

      const books: Books = Object.fromEntries(
        symbols.map((symbol) => [symbol, pools[symbol]![pick.int(pools[symbol]!.length)]!])
      );
      const record = lab.point(books);

      if (
        record.dd < eligibility.ceiling &&
        record.net > 0 &&
        record.lots >= Math.ceil(0.5 * eligibility.lotsPerYear * years) &&
        symbols.every((symbol) => (record.books[symbol]?.lots ?? 0) >= 1)
      ) {
        centres.push(books);
      }
    }

    const fams = [
      { name: 'n16a', n: 16 },
      { name: 'n16b', n: 16 },
      { name: 'n32', n: 32 },
      { name: 'n128', n: 128 }
    ];
    const rows: Record<string, { robust: number; median: number; p10: number; p90Dd: number; share: number }>[] = [];
    const t0 = performance.now();
    let evaluations = 0;

    for (const centre of centres) {
      const row: (typeof rows)[number] = {};

      for (const fam of fams) {
        const points = uniquePoints(
          familyDesign(centre, symbols, { n: fam.n, labels: ['pilot', 'nbhd', track, fam.name] }),
          centre
        );
        const summary = summarize(points.map((point) => lab.point(point.books)));

        evaluations += points.length;
        row[fam.name] = {
          robust: robustProfit(summary) / years,
          median: summary.medianNet / years,
          p10: summary.p10Net / years,
          p90Dd: summary.p90Dd,
          share: summary.share
        };
      }

      rows.push(row);
    }

    const elapsed = performance.now() - t0;
    const col = (fam: string, key: 'robust' | 'median' | 'p10' | 'p90Dd' | 'share') => rows.map((row) => row[fam]![key]);
    const corr = (a: string, b: string) =>
      Object.fromEntries(
        (['robust', 'median', 'p10', 'p90Dd', 'share'] as const).map((key) => [key, spearman(col(a, key), col(b, key))])
      );
    const shareGap = (a: string, b: string) =>
      rows.reduce((total, row) => total + Math.abs(row[a]!.share - row[b]!.share), 0) / Math.max(1, rows.length);

    precision[track] = {
      plausibleStandalone: Object.fromEntries(symbols.map((symbol) => [symbol, pools[symbol]!.length])),
      centres: centres.length,
      combosTried: tries,
      evaluations,
      msPerNeighbour: elapsed / Math.max(1, evaluations),
      spearman: { n16a_n128: corr('n16a', 'n128'), n16b_n128: corr('n16b', 'n128'), n32_n128: corr('n32', 'n128'), n16a_n16b: corr('n16a', 'n16b') },
      meanAbsShareGap: { n16a_n128: shareGap('n16a', 'n128'), n32_n128: shareGap('n32', 'n128'), n16a_n16b: shareGap('n16a', 'n16b') },
      rows
    };
    log(`pilot precision ${track}: ${centres.length} centres, ${evaluations} neighbours, ${(elapsed / 1000).toFixed(1)} s`);
  }

  const record = await writeSealed(resultFile('pilot', 'pilot.json'), {
    stage: 'PILOT',
    at: nowIso(),
    door: { key: door.key, id: door.id, last: door.dates[door.lastIndex], sessions: door.dates.length },
    years,
    loadMs,
    rssAfterLoadMb: Math.round(rssAfterLoad / 1e6),
    rssEndMb: Math.round(process.memoryUsage().rss / 1e6),
    timing,
    controls,
    precision,
    stats: lab.stats(),
    seconds: (Date.now() - started) / 1000
  });

  log(`pilot: ${JSON.stringify(record)}`);
};
