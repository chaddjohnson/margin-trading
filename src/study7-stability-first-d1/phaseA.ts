// Phase A (PROTOCOL.md §6): the five frozen configurations (B1, VG, VXR, VXRG, B5) and the GDX standalone controls,
// NO tuning, on the diag door's WDEV, W23 and W29 runs. Every set of §6.1, the decomposition and sequence diagnostics
// of §6.2 (W23, W29), drawdown episodes, sealed per configuration × window; `phase-a-freeze` seals the manifest.
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { Lab as Study6Lab, drawdownEpisodes, lotContributions, minuteSeries, newYork, quarterOf } from '../study6-b5-kre-robustness/evaluate.ts';
import {
  type FrozenPoolKey,
  type WindowKey,
  baselineManifestFile,
  bookOrder,
  executionSettings,
  frozenGrids,
  frozenPools,
  gdxControls,
  resultFile,
  windows
} from './context.ts';
import { type Door, openDoor } from './data.ts';
import { type DesignPoint, boundMass, clippingSummary, design, probesOf, uniqueMask } from './designs.ts';
import { type Books, Evaluator, Lab, PointCache, type PointRecord, baseSettings, booksKey, settingsWith } from './evaluate.ts';
import { codeDigest, fileSha256, log, nowIso, readSealed, writeSealed } from './records.ts';
import { median, summarize } from './stats.ts';

export type PhaseAKey = FrozenPoolKey | keyof typeof gdxControls;

export const phaseAKeys = [...Object.keys(frozenPools), ...Object.keys(gdxControls)] as PhaseAKey[];

const booksOf = (key: PhaseAKey): Books =>
  key in frozenPools
    ? Object.fromEntries(frozenPools[key as FrozenPoolKey].map((s) => [s, { ...frozenGrids[s] }]))
    : { GDX: { ...gdxControls[key]!.grid } };

export const phaseAFile = (key: PhaseAKey, window: WindowKey) => resultFile('phaseA', `${key}-${window}.json`);

const periodKeys = ['DEV', 'VAL', 'FX', 'M2020', 'R2223', '2018', '2020', '2022', '2023', '2024', '2025', '2026'];

const compactPoint = (point: DesignPoint, record: PointRecord) => ({
  i: point.index,
  dist: Math.round(point.distance * 1000) / 1000,
  clipped: point.clipped.length,
  net: record.net,
  dd: record.dd,
  ddDaily: record.ddDaily,
  trough: record.ddTrough,
  lots: record.lots,
  episodes: record.episodes,
  refused: record.refused,
  books: record.books,
  periods: Object.fromEntries(periodKeys.filter((k) => k in record.periods).map((k) => [k, record.periods[k]])),
  sig: record.signature
});

interface SetSpec {
  name: string;
  rep: number;
  perturb: string[];
  n: number;
  mode: 'clip' | 'inbox';
  scale: number;
  matchCount?: number;
}

const setsFor = (key: PhaseAKey, symbols: string[]): SetSpec[] => {
  const d = symbols.length * 8;
  const out: SetSpec[] = [];
  const add = (name: string, reps: number, spec: Omit<SetSpec, 'name' | 'rep'>) => {
    for (let rep = 1; rep <= reps; rep++) out.push({ name, rep, ...spec });
  };

  add('joint', 5, { perturb: symbols, n: 128, mode: 'clip', scale: 1 });
  add('joint-inbox', 3, { perturb: symbols, n: 128, mode: 'inbox', scale: 1 });
  add('joint-half', 2, { perturb: symbols, n: 128, mode: 'clip', scale: 0.5 });
  add('joint-wide', 2, { perturb: symbols, n: 128, mode: 'clip', scale: 1.5 });

  if (symbols.length > 1) {
    for (const symbol of symbols) add(`book-${symbol}`, 3, { perturb: [symbol], n: 64, mode: 'clip', scale: 1 });

    add('d8', 3, { perturb: symbols, n: 128, mode: 'clip', scale: 1, matchCount: 8 });
    add('norm', 3, { perturb: symbols, n: 128, mode: 'clip', scale: Math.sqrt(8 / d) });
  }

  if (symbols.length > 2) add('d16', 2, { perturb: symbols, n: 128, mode: 'clip', scale: 1, matchCount: 16 });

  void key;
  return out;
};

const lotKey = (lot: { symbol: string; entryTime: number; exitTime: number }) => `${lot.symbol}|${lot.entryTime}|${lot.exitTime}`;

export const runPhaseA = async (key: PhaseAKey, window: WindowKey) => {
  const file = phaseAFile(key, window);

  if (await fs.pathExists(baselineManifestFile)) throw new Error('the Phase A baseline is sealed; Phase A refuses to re-run');
  if (await fs.pathExists(file)) throw new Error(`${file} exists (sealed)`);
  if (!['WDEV', 'W23', 'W29'].includes(window)) throw new Error('Phase A windows: WDEV, W23, W29');

  const started = Date.now();
  const centreBooks = booksOf(key);
  const symbols = (bookOrder as readonly string[]).filter((s) => s in centreBooks);
  const door: Door = await openDoor('diag', symbols, `Phase A ${key} ${window}`, { windowKey: window });
  const ev = new Evaluator(door);
  const lab = new Lab(ev, PointCache.memory(door));
  const centre = lab.point(centreBooks);
  const execution = Object.fromEntries(
    executionSettings.map((setting) => {
      const { key: name, ...overrides } = setting;

      return [name, lab.point(centreBooks, settingsWith(overrides))];
    })
  );
  const sets: Record<string, unknown> = {};
  const pointsOut: Record<string, unknown[]> = {};
  const jointPoints: Record<number, DesignPoint[]> = {};

  for (const spec of setsFor(key, symbols)) {
    const points = design({
      centre: centreBooks,
      perturb: spec.perturb,
      n: spec.n,
      labels: ['A', spec.name, key, spec.rep],
      mode: spec.mode,
      scale: spec.scale,
      ...(spec.matchCount !== undefined ? { matchCount: spec.matchCount } : {})
    });
    const mask = uniqueMask(points, centreBooks);
    const kept = points.filter((_p, i) => mask[i]);
    const records = kept.map((point) => lab.point(point.books));
    const summary = summarize(records, periodKeys);
    const name = `${spec.name}#${spec.rep}`;
    const behaviouralSameAsCentre = records.filter((r) => r.signature === centre.signature).length;

    sets[name] = {
      design: { ...spec, labels: ['A', spec.name, key, spec.rep] },
      unique: kept.length,
      duplicates: points.length - kept.length,
      behaviouralSameAsCentre,
      clipping: clippingSummary(points),
      boundMass: boundMass(points, spec.perturb),
      summary,
      centrePercentile: records.filter((r) => r.net < centre.net).length / Math.max(1, records.length),
      breachQuarters: Object.fromEntries(
        Object.entries(
          records
            .filter((r) => r.dd >= 35000)
            .reduce<Record<string, number>>((acc, r) => {
              const q = quarterOf(Date.parse(r.ddTrough) / 1000);

              acc[q] = (acc[q] ?? 0) + 1;
              return acc;
            }, {})
        ).sort()
      )
    };
    pointsOut[name] = kept.map((point, i) => compactPoint(point, records[i]!));

    if (spec.name === 'joint') jointPoints[spec.rep] = kept;
  }

  // probes (each book)
  const probes: Record<string, unknown> = {};

  for (const symbol of symbols) {
    const { probes: list, dropped } = probesOf(centreBooks[symbol]!);

    probes[symbol] = {
      dropped,
      rows: list.map((probe) => {
        const record = lab.point({ ...centreBooks, [symbol]: probe.grid });

        return { key: probe.key, offset: probe.offset, net: record.net, dd: record.dd, lots: record.lots };
      })
    };
  }

  // §6.2 decomposition and sequence diagnostics (W23, W29; joint reps 1–3)
  let decomposition: unknown = null;

  if (window !== 'WDEV') {
    const standaloneCentre = Object.fromEntries(symbols.map((s) => [s, lab.point({ [s]: centreBooks[s]! }).net]));
    const centreLots = ev.replay(centreBooks).lots;
    const centreLotKeys = new Set(centreLots.map(lotKey));
    const rows: Record<string, unknown>[] = [];

    for (const rep of [1, 2, 3]) {
      for (const point of jointPoints[rep] ?? []) {
        const record = lab.point(point.books);
        const breach = record.dd >= 35000;
        const reset = Object.fromEntries(
          symbols.map((s) => [s, symbols.length > 1 ? lab.point({ ...point.books, [s]: centreBooks[s]! }).dd >= 35000 : false])
        );
        const only = Object.fromEntries(
          symbols.map((s) => [s, symbols.length > 1 ? lab.point({ ...centreBooks, [s]: point.books[s]! }).dd >= 35000 : breach])
        );
        const standaloneDelta = Object.fromEntries(symbols.map((s) => [s, lab.point({ [s]: point.books[s]! }).net - standaloneCentre[s]!]));
        const deltaPool = record.net - centre.net;
        const sumStandalone = Object.values(standaloneDelta).reduce((a, b) => a + b, 0);
        const lots = rep === 1 ? ev.replay(point.books).lots : undefined;
        const sequence = lots
          ? (() => {
              const keys = new Set(lots.map(lotKey));
              const kept = [...centreLotKeys].filter((k) => keys.has(k)).length;
              const inWindow = (date: string, start: string, end: string) => date >= start && date <= end;
              const dateOf = (index: number) => door.dates[index] ?? '';
              const windowStats = (start: string, end: string) => {
                const mine = lots.filter((l) => inWindow(dateOf(l.entryIndex), start, end));
                const theirs = centreLots.filter((l) => inWindow(dateOf(l.entryIndex), start, end));

                return {
                  lots: mine.length,
                  centreLots: theirs.length,
                  kept: mine.filter((l) => centreLotKeys.has(lotKey(l))).length,
                  net: Math.round(mine.reduce((a, l) => a + l.net, 0) * 100) / 100,
                  bySymbol: mine.reduce<Record<string, number>>((acc, l) => ((acc[l.symbol] = (acc[l.symbol] ?? 0) + 1), acc), {})
                };
              };

              return {
                kept,
                centreLots: centreLotKeys.size,
                lots: keys.size,
                displaced: centreLotKeys.size - kept,
                added: keys.size - kept,
                jaccard: kept / (centreLotKeys.size + keys.size - kept),
                m2020: windowStats('2020-02-15', '2020-04-30'),
                r2223: windowStats('2022-01-01', '2023-12-31')
              };
            })()
          : undefined;

        rows.push({ rep, i: point.index, breach, dd: record.dd, net: record.net, reset, only, deltaPool, standaloneDelta, interaction: deltaPool - sumStandalone, sequence });
      }
    }

    const breaches = rows.filter((r) => r.breach);
    const importance = Object.fromEntries(
      symbols.map((s) => [
        s,
        breaches.length ? breaches.filter((r) => !(r.reset as Record<string, boolean>)[s]).length / breaches.length : NaN
      ])
    );
    const onlyShare = Object.fromEntries(
      symbols.map((s) => [s, breaches.length ? breaches.filter((r) => (r.only as Record<string, boolean>)[s]).length / breaches.length : NaN])
    );
    const absMedian = (values: number[]) => {
      const sorted = values.map(Math.abs).sort((a, b) => a - b);

      return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : NaN;
    };
    const variance = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

      return values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, values.length - 1);
    };
    const deltas = rows.map((r) => r.deltaPool as number);
    const interactions = rows.map((r) => r.interaction as number);
    const sums = rows.map((r) => (r.deltaPool as number) - (r.interaction as number));
    const seqRows = rows.filter((r) => r.sequence).map((r) => r.sequence as Record<string, number>);

    decomposition = {
      points: rows.length,
      breaches: breaches.length,
      importance,
      onlyBookSufficient: onlyShare,
      ownVsFunding: {
        medianAbsDeltaPool: absMedian(deltas),
        medianAbsInteraction: absMedian(interactions),
        medianAbsStandaloneSum: absMedian(sums),
        varianceDeltaPool: variance(deltas),
        varianceInteraction: variance(interactions),
        varianceStandaloneSum: variance(sums)
      },
      sequence: seqRows.length
        ? {
            n: seqRows.length,
            medianKeptShare: median(seqRows.map((s) => s.kept! / Math.max(1, s.centreLots!))),
            medianJaccard: median(seqRows.map((s) => s.jaccard!)),
            medianDisplaced: median(seqRows.map((s) => s.displaced!)),
            medianAdded: median(seqRows.map((s) => s.added!))
          }
        : null,
      rows
    };
  }

  // worst drawdown of the centre and of the rep-1 representative breach (lot decomposition, Study 6 machinery)
  const s6 = new Study6Lab(door as never);
  const ddOf = (books: Books) => {
    const result = s6.replay(books, baseSettings, true);
    const series = minuteSeries(s6, result, books, baseSettings);
    const contributions = lotContributions(series, series.peakIndex, series.troughIndex);
    const at = (index: number) => series.points[index];

    return {
      maximum: series.maximum,
      matchesTracker: series.matchesTracker,
      peak: newYork(at(series.peakIndex)?.time ?? 0),
      trough: newYork(at(series.troughIndex)?.time ?? 0),
      lots: contributions.rows.map((row) => ({ ...row, entry: newYork(row.entryTime), exit: newYork(row.exitTime) })),
      residual: contributions.residual,
      episodes: drawdownEpisodes(series, 5).map((e) => ({
        depth: e.depth,
        peak: newYork(series.points[e.peakIndex]?.time ?? 0),
        trough: newYork(series.points[e.troughIndex]?.time ?? 0)
      }))
    };
  };
  const repBreach = (jointPoints[1] ?? []).map((point) => ({ point, record: lab.point(point.books) })).filter((x) => x.record.dd >= 35000).sort((a, b) => a.point.distance - b.point.distance)[0];
  const drawdowns = { centre: ddOf(centreBooks), representativeBreach: repBreach ? { index: repBreach.point.index, books: booksKey(repBreach.point.books), ...ddOf(repBreach.point.books) } : null };
  const lots = ev.replay(centreBooks).lots.map((lot) => ({
    symbol: lot.symbol,
    entry: newYork(lot.entryTime),
    exit: lot.exitTime > 0 ? newYork(lot.exitTime) : '',
    net: Math.round(lot.net * 100) / 100,
    interest: Math.round(lot.interest * 100) / 100,
    costs: Math.round(lot.costs * 100) / 100,
    open: lot.open
  }));
  const pointsFile = file.replace(/\.json$/, '-points.jsonl.gz');

  await fs.outputFile(
    pointsFile,
    zlib.gzipSync(Object.entries(pointsOut).flatMap(([name, list]) => list.map((row) => JSON.stringify({ set: name, ...(row as object) }))).join('\n') + '\n', { level: 9 })
  );

  const record = await writeSealed(file, {
    stage: 'PHASE_A',
    key,
    window,
    windowEnd: windows[window],
    at: nowIso(),
    door: { id: door.id, last: door.dates[door.lastIndex], sessions: door.dates.length },
    books: centreBooks,
    centre,
    execution,
    sets,
    probes,
    decomposition,
    drawdowns,
    lots,
    pointsFile: { file: pointsFile, sha256: await fileSha256(pointsFile) },
    stats: lab.stats(),
    seconds: (Date.now() - started) / 1000
  });

  log(`Phase A ${key} ${window}: ${record.file} ${record.bodyHash.slice(0, 12)} (${lab.computed} points, ${((Date.now() - started) / 1000).toFixed(0)} s)`);

};

export const runPhaseAFreeze = async () => {
  if (await fs.pathExists(baselineManifestFile)) throw new Error(`${baselineManifestFile} exists (sealed)`);

  const records: Record<string, { bodyHash: string; fileSha256: string; pointsSha256?: string }> = {};
  const missing: string[] = [];

  for (const key of phaseAKeys) {
    for (const window of ['WDEV', 'W23', 'W29'] as WindowKey[]) {
      const file = phaseAFile(key, window);

      if (!(await fs.pathExists(file))) {
        missing.push(file);
        continue;
      }

      const sealed = await readSealed<{ bodyHash: string; pointsFile: { file: string; sha256: string } }>(file);

      if ((await fileSha256(sealed.pointsFile.file)) !== sealed.pointsFile.sha256) throw new Error(`${sealed.pointsFile.file}: hash mismatch`);

      records[file] = { bodyHash: sealed.bodyHash, fileSha256: await fileSha256(file), pointsSha256: sealed.pointsFile.sha256 };
    }
  }

  if (missing.length) throw new Error(`Phase A incomplete: ${missing.join(', ')}`);

  const record = await writeSealed(baselineManifestFile, {
    stage: 'PHASE_A_BASELINE',
    at: nowIso(),
    records,
    code: await codeDigest(),
    data: Object.fromEntries(await Promise.all((bookOrder as readonly string[]).map(async (s) => [s, await fileSha256(`data/${s}/data.csv`)])))
  });

  log(`Phase A baseline sealed: ${record.file} ${record.bodyHash.slice(0, 12)}`);
};
