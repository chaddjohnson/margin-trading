// The final stage (PROTOCOL.md §11.3): the final door (full history to 2026-10-29), once, after FROZEN_SELECTION.json
// is sealed. It evaluates every sealed role holder and the controls with the `final` families (new seeds) and the
// full sensitivity battery, and FLAGS each role holder F1–F4 (block-only: no re-ranking, no replacement). Fold-M/L
// shortlist members get centre figures only. `--confirm` repeats the stage deterministically into confirmation.json.
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { stationaryBootstrap } from '../b4-b5-robustness/analysis.ts';
import { Rng } from '../optimizer/rng.ts';
import { Lab as Study6Lab, drawdownEpisodes, lotContributions, minuteSeries, newYork } from '../study6-b5-kre-robustness/evaluate.ts';
import {
  bookOrder,
  bootstrap,
  cacheDir,
  eligibility,
  executionSettings,
  frozenGrids,
  frozenPools,
  frozenSelectionFile,
  gdxControls,
  resultFile,
  seedOf,
  years
} from './context.ts';
import { openDoor } from './data.ts';
import { type Books, Evaluator, Lab, PointCache, baseSettings, booksKey, cacheFileOf, settingsWith } from './evaluate.ts';
import { type Evidence, evidenceOf } from './evidence.ts';
import { floorsOf } from './fitness.ts';
import { fileSha256, log, nowIso, readSealed, writeSealed } from './records.ts';

export const finalFile = resultFile('final', 'final.json');
export const confirmationFile = resultFile('final', 'confirmation.json');

interface Frozen {
  ranked: { rank: number; track: string; path: string; role: string; id: string; books: Books; tier: string; class: string }[];
  finalPlan: { shortlists: { track: string; path: string; id: string; books: Books }[] };
  bodyHash: string;
}

const controlsAll = (): Record<string, Books> => ({
  ...Object.fromEntries(
    Object.entries(frozenPools).map(([key, symbols]) => [key, Object.fromEntries(symbols.map((s) => [s, { ...frozenGrids[s] }]))])
  ),
  ...Object.fromEntries(Object.entries(gdxControls).map(([key, control]) => [key, { GDX: { ...control.grid } }]))
});

export const runFinal = async ({ confirm }: { confirm: boolean }) => {
  const out = confirm ? confirmationFile : finalFile;

  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed); the final stage runs once (and --confirm once)`);
  if (confirm && !(await fs.pathExists(finalFile))) throw new Error('--confirm needs the sealed final record');

  const started = Date.now();
  const frozen = await readSealed<Frozen>(frozenSelectionFile);
  const door = await openDoor('final', [...bookOrder], `final stage${confirm ? ' (confirm)' : ''}`);
  const ev = new Evaluator(door);
  const lab = new Lab(ev, confirm ? PointCache.memory(door) : await PointCache.open(door, cacheFileOf(cacheDir, 'final')));
  const y = ev.yearsOfRun();
  const floors = floorsOf(y, 2017, 2026);
  const options = { prefix: 'final', track: 'final', fold: 'all', floors, trainKey: 'DEV', testKey: 'FX' };
  const s6 = new Study6Lab(door as never);
  const ddOf = (books: Books) => {
    const result = s6.replay(books, baseSettings, true);
    const series = minuteSeries(s6, result, books, baseSettings);
    const contributions = lotContributions(series, series.peakIndex, series.troughIndex);

    return {
      maximum: series.maximum,
      matchesTracker: series.matchesTracker,
      peak: newYork(series.points[series.peakIndex]?.time ?? 0),
      trough: newYork(series.points[series.troughIndex]?.time ?? 0),
      lots: contributions.rows.map((row) => ({ symbol: row.symbol, entry: newYork(row.entryTime), exit: newYork(row.exitTime), net: row.net, contribution: row.contribution })),
      residual: contributions.residual,
      episodes: drawdownEpisodes(series, 5).map((e) => ({ depth: e.depth, peak: newYork(series.points[e.peakIndex]?.time ?? 0), trough: newYork(series.points[e.troughIndex]?.time ?? 0) }))
    };
  };
  const deep = (books: Books) => {
    const centre = lab.point(books);
    const result = ev.replay(books);
    const lots = result.lots;
    const sensitivities = Object.fromEntries(
      [...executionSettings, { key: 'arm2017-12-15', armDate: '2017-12-15' }, { key: 'arm2018-06-15', armDate: '2018-06-15' }].map((setting) => {
        const { key, ...overrides } = setting;
        const record = lab.point(books, settingsWith(overrides));

        return [key, { net: record.net, dd: record.dd, ddDaily: record.ddDaily, lots: record.lots, FX: record.periods.FX }];
      })
    );
    const leaveOneYearOut = Object.fromEntries(years.map((year) => [String(year), centre.net - (centre.periods[String(year)] ?? 0)]));
    const lotSum = lots.reduce((a, l) => a + l.net, 0);

    return {
      sensitivities,
      leaveOneYearOut,
      reconciliation: {
        lotSum,
        net: result.net,
        realizedPlusUnrealized: result.realized + result.unrealized,
        lotSumEqualsNet: Math.abs(lotSum - result.net) < 0.01,
        realizedPlusUnrealizedEqualsNet: Math.abs(result.realized + result.unrealized - result.net) < 0.01
      },
      drawdown: ddOf(books),
      lots: lots.map((l) => ({ symbol: l.symbol, entry: newYork(l.entryTime), exit: l.exitTime > 0 ? newYork(l.exitTime) : '', net: l.net, interest: l.interest, costs: l.costs, open: l.open })),
      marks: result.marks
    };
  };

  // controls
  const controls: Record<string, { evidence: Evidence; deep: Omit<ReturnType<typeof deep>, 'marks'> }> = {};
  const marksOf: Record<string, Float64Array> = {};

  for (const [key, books] of Object.entries(controlsAll())) {
    const evidence = evidenceOf(lab, books, { ...options, sequence: Object.keys(books).length > 1 });
    const { marks, ...rest } = deep(books);

    marksOf[`control:${key}`] = marks;
    controls[key] = { evidence, deep: rest };
    lab.cache.flushSync();
    log(`final: control ${key} done`);
  }

  // role holders, in the sealed rank order (flags only)
  const ranges = ev.ranges();
  const rangeOf = (key: string) => ranges.find((r) => r.key === key)!;
  const pairedBootstrap = (a: Float64Array, b: Float64Array, key: string, label: string) => {
    const range = rangeOf(key);
    const diffs: number[] = [];

    for (let i = range.first; i <= range.last; i++) {
      const prev = i > 0 ? (a[i - 1]! - b[i - 1]!) : 0;

      diffs.push(a[i]! - b[i]! - prev);
    }

    const totals = stationaryBootstrap([diffs], bootstrap.blockLength, bootstrap.resamples, Rng.from(...seedOf('final', 'bootstrap', label, key)))[0]!.sort((x, z) => x - z);
    const q = (p: number) => totals[Math.min(totals.length - 1, Math.max(0, Math.round(p * (totals.length - 1))))]!;

    return { observed: diffs.reduce((s, v) => s + v, 0), mean: totals.reduce((s, v) => s + v, 0) / totals.length, p05: q(0.05), p50: q(0.5), p95: q(0.95), shareAboveZero: totals.filter((v) => v > 0).length / totals.length };
  };
  const nominations = frozen.ranked.map((holder) => {
    const evidence = evidenceOf(lab, holder.books, options);
    const { marks, ...rest } = deep(holder.books);
    const record = evidence.centre.record;
    const nb = evidence.decisive.nb;
    const F1 = record.dd < eligibility.ceiling;
    const F2 = nb.share >= eligibility.share && nb.p90Dd < eligibility.ceiling;
    const F2b = evidence.nearBound.length === 0 || (evidence.alternates.inbox!.nb.share >= eligibility.share && evidence.alternates.inbox!.nb.p90Dd < eligibility.ceiling);
    const F3 = (record.periods.FX ?? NaN) > 0 && (evidence.decisive.test?.median ?? NaN) > 0;
    const F4 = record.net > 0 && evidence.centre.bestYearShare <= eligibility.topYearShare && evidence.centre.exBestPerYear >= eligibility.exBestPerYear;
    const flags = { F1, F2, F2b, F3, F4 };
    const blocked = Object.entries(flags).filter(([, v]) => !v).map(([k]) => k);
    const marginal = F2 && (nb.share <= 0.93 || evidence.perRep.some((r) => !(r.nb.share >= eligibility.share && r.nb.p90Dd < eligibility.ceiling)));
    const subset = Object.entries(frozenPools).find(([, symbols]) => symbols.length === Object.keys(holder.books).length && symbols.every((s) => s in holder.books))?.[0];
    const comparisons = Object.fromEntries(
      ['B1', 'B5', ...(subset && subset !== 'B1' ? [subset] : [])].flatMap((control) =>
        ['FULL', 'FX'].map((key) => [`${control}:${key}`, pairedBootstrap(marks, marksOf[`control:${control}`]!, key, `${holder.id}-${control}`)])
      )
    );

    lab.cache.flushSync();
    log(`final: #${holder.rank} ${holder.track}/${holder.path} ${holder.role} ${holder.id}: ${blocked.length ? `blocked by ${blocked.join(',')}` : 'not blocked'}`);

    return { ...holder, evidence, deep: rest, flags, blocked, nominated: blocked.length === 0, marginal, comparisons };
  });

  // fold-M/L shortlist members: centre figures only (descriptive)
  const shortlists = frozen.finalPlan.shortlists.map((item) => {
    const record = lab.point(item.books);

    return { ...item, net: record.net, dd: record.dd, ddDaily: record.ddDaily, lots: record.lots, periods: record.periods };
  });

  // W13 (the pinned endpoint) for the role holders and the controls
  const w13 = await openDoor('final', [...bookOrder], `final stage W13${confirm ? ' (confirm)' : ''}`, { windowKey: 'W13' });
  const ev13 = new Evaluator(w13);
  const w13Rows = Object.fromEntries(
    [...frozen.ranked.map((h) => [`${h.track}/${h.path}/${h.id}`, h.books] as const), ...Object.entries(controlsAll())].map(([key, books]) => {
      const record = ev13.point(books);

      return [key, { net: record.net, dd: record.dd, lots: record.lots }];
    })
  );

  lab.cache.flushSync();

  const lotsFile = out.replace(/\.json$/, '-lots.jsonl.gz');

  await fs.outputFile(
    lotsFile,
    zlib.gzipSync(
      [...Object.entries(controls).map(([key, c]) => ({ who: `control:${key}`, lots: c.deep.lots })), ...nominations.map((n) => ({ who: `${n.track}/${n.path}/${n.id}`, lots: n.deep.lots }))]
        .map((row) => JSON.stringify(row))
        .join('\n') + '\n',
      { level: 9 }
    )
  );

  const strip = <T extends { deep: { lots: unknown } }>(row: T) => ({ ...row, deep: { ...row.deep, lots: undefined } });
  const body = {
    stage: confirm ? 'FINAL_CONFIRM' : 'FINAL',
    at: nowIso(),
    selection: { file: frozenSelectionFile, bodyHash: frozen.bodyHash },
    door: { id: door.id, last: door.dates[door.lastIndex], sessions: door.dates.length },
    y,
    nominations: nominations.map(strip),
    nominated: nominations.filter((n) => n.nominated).map((n) => ({ rank: n.rank, track: n.track, path: n.path, role: n.role, id: n.id, tier: n.tier, class: n.class, marginal: n.marginal })),
    controls: Object.fromEntries(Object.entries(controls).map(([key, c]) => [key, strip(c)])),
    shortlists,
    w13: w13Rows,
    lots: { file: lotsFile, sha256: await fileSha256(lotsFile) },
    stats: lab.stats(),
    seconds: (Date.now() - started) / 1000
  };
  const record = await writeSealed(out, body);

  log(`final${confirm ? ' --confirm' : ''}: ${record.file} ${record.bodyHash.slice(0, 12)}; nominated ${body.nominated.length}`);

  if (confirm) {
    const a = await readSealed<Record<string, unknown>>(finalFile);
    const b = await readSealed<Record<string, unknown>>(confirmationFile);
    const core = (r: Record<string, unknown>) => JSON.stringify({ nominations: r.nominations, controls: r.controls, shortlists: r.shortlists, w13: r.w13, nominated: r.nominated });

    log(`final --confirm: ${core(a) === core(b) ? 'IDENTICAL to final.json' : 'DIFFERS from final.json'}`);
  }

  void booksKey;
};
