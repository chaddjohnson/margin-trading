// Part A — the frozen diagnosis (PROTOCOL.md §6): the data stage (S2), earlier evidence (A1), the baseline (A2), the
// neighbourhoods of every §5.4 set (A3), KRE attribution and the joint decomposition (A4), B1 (A5) and the ablations
// (A6). Every record is sealed and write-once; nothing here selects or tunes anything.
import fs from 'fs-extra';
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { type WindowKey, bookOrder, frozenGrids, resultFile, windows } from './context.ts';
import { openDoor, sha256 } from './data.ts';
import {
  type Books,
  boundMass,
  clippingSummary,
  lineOf,
  onlyBook,
  probesOf,
  resetBook,
  uniqueMask
} from './designs.ts';
import { type PointRecord, type SetSummary, Lab, ceiling, summarize } from './evaluate.ts';
import { fileSha256, log, nowIso, writeCsv, writeSealed } from './records.ts';
import {
  type NamedSet,
  b1Centre,
  b1Sets,
  bookSets,
  frozenB5,
  jointSets,
  kreSets,
  pairSets,
  paramsText
} from './sets.ts';

const five = [...bookOrder];

// ----- S2: data -----

export const runDataAudit = async () => {
  const rows: Record<string, unknown>[] = [];
  const pins = (
    (await fs.readJson('config/pools/B5.json')) as { regressionAnchors: { dataSha256: Record<string, string> } }
  ).regressionAnchors.dataSha256;
  // The first New York date after the pinned endpoint starts at 2026-10-14 00:00 EDT = 04:00 UTC.
  const cut = '"2026-10-14T04:00:00Z"';

  for (const symbol of five) {
    const file = `data/${symbol}/data.csv`;
    const bytes = await fs.readFile(file);
    let offset = 0;
    let prefixEnd = -1;
    let rows13 = 0;
    let rowsAll = 0;
    let first = '';
    let last = '';

    while (offset < bytes.length) {
      const end = bytes.indexOf(10, offset);
      const lineEnd = end < 0 ? bytes.length : end;
      const stamp = bytes.toString('utf8', offset, Math.min(lineEnd, offset + 22));

      if (!first) {
        first = stamp;
      }

      last = stamp;
      rowsAll++;

      if (stamp < cut) {
        rows13++;
        prefixEnd = end < 0 ? bytes.length : end + 1;
      }

      offset = lineEnd + 1;
    }

    const prefixSha = sha256(bytes.subarray(0, prefixEnd));

    rows.push({
      symbol,
      file,
      bytes: bytes.length,
      rows: rowsAll,
      sha256: sha256(bytes),
      first,
      last,
      rowsThrough20261013: rows13,
      prefixSha256: prefixSha,
      pin: pins[symbol],
      prefixEqualsPin: prefixSha === pins[symbol],
      appendedRows: rowsAll - rows13
    });
    log(`data ${symbol}: prefix ${prefixSha === pins[symbol] ? '=' : '≠'} pin; ${rowsAll - rows13} rows appended`);
  }

  const door = await openDoor('diag', five, 'data audit (sessions)', 'W29');
  const { dates } = door;
  const recent = dates.filter((date) => date > windows.W13);
  const bars = Object.fromEntries(
    five.map((symbol) => {
      const ds = door.loaded.universe.instruments[symbol]!.ds;

      return [symbol, recent.map((date) => ds.sBarCount[dates.indexOf(date)]!)];
    })
  );
  const passed = rows.every((row) => row.prefixEqualsPin === true) && dates[dates.length - 1] === windows.W29;
  const record = await writeSealed(resultFile('data', 'data-audit.json'), {
    stage: 'S2-data',
    at: nowIso(),
    files: rows,
    sessions: {
      first: dates[0],
      last: dates[dates.length - 1],
      count: dates.length,
      eligibility: dates[door.eligibilityIndex]
    },
    recentSessions: recent,
    recentRegularBars: bars,
    partitionsSha256: await fileSha256('data/partitions.json'),
    splitsSha256: await fileSha256('config/market-events/splits.json'),
    distributionLedger: { file: door.loaded.distributions.file, sha256: door.loaded.distributions.sha256 },
    passed
  });

  log(`data audit: ${passed ? 'PASS' : 'FAIL'}; ${record.file} ${record.bodyHash.slice(0, 12)}`);

  if (!passed) {
    throw new Error('the data stage failed (PROTOCOL.md §8.2): the study stops');
  }
};

// ----- A1: earlier evidence (read-only) -----

const statsOf = (dd: number[], net: number[]) => ({
  n: dd.length,
  shareBelow35k: dd.filter((value) => value < ceiling).length / dd.length,
  shareAtMost35k: dd.filter((value) => value <= ceiling).length / dd.length,
  ddMedian: quantile(dd, 0.5),
  ddP90: quantile(dd, 0.9),
  ddWorst: Math.max(...dd),
  netMedian: quantile(net, 0.5),
  netP10: quantile(net, 0.1)
});

export const runEvidence = async () => {
  const sources: Record<string, unknown>[] = [];
  const hash = async (file: string) => ({ file, sha256: await fileSha256(file) });

  // research/b4-b5-robustness-audit: fixed-mode joint (2 seeds × 64) and per-book (32 per book) runs of B5.
  const audit = 'research/b4-b5-robustness-audit';
  const jsonl = async (file: string) =>
    (await fs.readFile(file, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  const joint = (await jsonl(`${audit}/results/runs/joint.jsonl`)).filter(
    (row) => row.pool === 'B5' && row.mode === 'fixed'
  );
  const book = (await jsonl(`${audit}/results/runs/book.jsonl`)).filter(
    (row) => row.pool === 'B5' && row.mode === 'fixed'
  );
  const auditStats: Record<string, unknown> = {};

  for (const design of ['joint-s1', 'joint-s2']) {
    const rows = joint.filter((row) => (row.meta as { design: string }).design === design);

    auditStats[design] = statsOf(
      rows.map((row) => row.minuteDD as number),
      rows.map((row) => row.net as number)
    );
  }

  auditStats['joint-both'] = statsOf(
    joint.map((row) => row.minuteDD as number),
    joint.map((row) => row.net as number)
  );

  for (const symbol of five) {
    const rows = book.filter((row) => JSON.stringify(row.meta).includes(`"${symbol}"`));

    auditStats[`book-${symbol}`] = rows.length
      ? statsOf(
          rows.map((row) => row.minuteDD as number),
          rows.map((row) => row.net as number)
        )
      : { n: 0 };
  }

  sources.push({
    study: 'b4-b5-robustness-audit',
    date: '2026-10-27',
    files: [
      await hash(`${audit}/results/runs/joint.jsonl`),
      await hash(`${audit}/results/runs/book.jsonl`),
      await hash(`${audit}/MANIFEST.json`),
      await hash(`${audit}/PROTOCOL.md`)
    ],
    protocol:
      'fixed $100k, 5 bps, 11%, continuous all 2016-01-04 → 2026-10-13 (W13); joint = 40-D Latin hypercube, each coordinate uniform over the legal engine-grid values in [v − m, v + m] (m = the "moderate" distance: ±1.0 pp for percentages ≥ 2.0%, ±max(0.2 pp, 50%·v) below 2.0%, ±max(s+1, 20%·v) for integers; legal grid, not the eight-ETF box), n = 64 per seed, 2 seeds; per-book n = 32',
    stats: auditStats
  });

  // d1-robust-pool-discovery and d1-diverse-pool-discovery (training window, ±u lattice N1; A2 = ±2u).
  const robustFile = 'research/d1-robust-pool-discovery/results/final/benchmarks.json';
  const robust = (await fs.readJson(robustFile)) as { benchmarks: Record<string, Record<string, unknown>> };
  const confirmBFile = 'research/d1-robust-pool-discovery/results/confirmB/confirmB.json';
  const confirmB = (await fs.readJson(confirmBFile)) as { rows: { label: string; confirmB: unknown }[] };
  const pick = (value: unknown) => {
    const v = value as Record<string, number>;

    return { n: v.n, feasShareAtMost35k: v.feasShare, dd90: v.dd90, ddMedian: v.ddMedian, p50: v.p50, centre: v.base };
  };
  const b5 = robust.benchmarks.B5!;
  const b1 = robust.benchmarks.B1!;

  sources.push({
    study: 'd1-robust-pool-discovery',
    date: '2026-10-25',
    files: [
      await hash(robustFile),
      await hash(confirmBFile),
      await hash('research/d1-robust-pool-discovery/PROTOCOL.md')
    ],
    protocol:
      'fixed $100k, 5 bps, training window 2016-01-04 → 2023-12-29; N1 = every coordinate −1/0/+1 step unit u (X 0.5 pt, Y 0.1, stop 0.5, hold 1, L 5, buffer 0.5, P 0.5, W 10), reflected at the eight-ETF box; A2 = ±2u; N2 = 3 coordinates; N3 = one book; feasShare = DD ≤ $35,000',
    B5: {
      confirmA: pick(b5.confirmA),
      confirmA10bps: pick(b5.confirmA10),
      a2: pick(b5.a2),
      n2: pick(b5.n2),
      confirmB: pick(confirmB.rows.find((row) => row.label === 'B5')?.confirmB)
    },
    B1: { confirmA: pick(b1.confirmA), a2: pick(b1.a2), n2: pick(b1.n2) }
  });

  const diverseFile = 'research/d1-diverse-pool-discovery/results/rounds/final/select/benchmarks.json';
  const diverse = (await fs.readJson(diverseFile)) as {
    benchmarks: Record<
      string,
      { confirmA: Record<string, unknown>; a2: unknown; n2: unknown; n3: Record<string, unknown> }
    >;
  };
  const d5 = diverse.benchmarks.B5!;

  sources.push({
    study: 'd1-diverse-pool-discovery',
    date: '2026-10-26',
    files: [await hash(diverseFile)],
    protocol: 'as d1-robust-pool-discovery (same N1 definitions, training window, 5 bps)',
    B5: {
      confirmA: pick(d5.confirmA.nbJ),
      a2: pick(d5.a2),
      n2: pick(d5.n2),
      n3PerBook: Object.fromEntries(Object.entries(d5.n3).map(([symbol, value]) => [symbol, pick(value)]))
    }
  });

  for (const [study, file, note] of [
    [
      'joint-16-etf-d1',
      'research/joint-16-etf-d1/results/robust/robust.json',
      '48 joint ±1-step perturbations, clamped at the box, training window, 5 bps (nets only stored)'
    ],
    [
      'd1-ranked-preemption',
      'research/d1-ranked-preemption/results/controls/final/CONTROLS.json',
      'B5 books under the ranked-preemption policy P1 (NOT the frozen shadow policy); 64 N1 draws, training window, 5 bps'
    ]
  ] as const) {
    if (await fs.pathExists(file)) {
      sources.push({ study, files: [await hash(file)], protocol: note, extracted: 'see BASELINE_AND_B1_B5_AUDIT.md' });
    }
  }

  const record = await writeSealed(resultFile('partA', 'A1-evidence.json'), {
    stage: 'A1-evidence',
    at: nowIso(),
    sources
  });

  log(`A1: ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

// ----- shared: evaluate a named set -----

export interface SetResult {
  set: NamedSet;
  records: PointRecord[];
  unique: boolean[];
  summary: SetSummary;
}

export const evaluateSet = (lab: Lab, set: NamedSet, centre: PointRecord): SetResult => {
  const records = set.points.map((point) => lab.point(point.books));
  const unique = uniqueMask(set.points, set.centre);

  return { set, records, unique, summary: summarize(records, unique, centre) };
};

export const rowsOf = (result: SetResult) =>
  result.set.points.map((point, index) => {
    const record = result.records[index]!;

    return {
      set: result.set.id,
      family: result.set.family,
      rep: result.set.rep,
      index: point.index,
      unique: result.unique[index] ? 1 : 0,
      distance: Math.round(point.distance * 1e4) / 1e4,
      clipped: point.clipped.map((clip) => `${clip.symbol}.${clip.key}:${clip.bound}`).join(';'),
      params: paramsText(point.books, result.set.perturb),
      net: record.net,
      dd: record.dd,
      ddDaily: record.ddDaily,
      ddPeak: record.ddPeak,
      ddTrough: record.ddTrough,
      interest: record.interest,
      gross: record.gross,
      costs: record.costs,
      lots: record.lots,
      open: record.open,
      kreLots: record.kreLots,
      kreNet: record.kreNet,
      occupancy: record.occupancy,
      heldDays: record.heldDays,
      decisions: record.decisions,
      granted: record.granted,
      refused: record.refused,
      kreRefused: record.kreRefused,
      refusedByKre: record.refusedByKre,
      DEV: record.periods.DEV ?? '',
      VAL: record.periods.VAL ?? '',
      FX: record.periods.FX ?? '',
      RECENT: record.periods.RECENT ?? '',
      signature: record.signature
    };
  });

const pooledSummary = (results: SetResult[], centre: PointRecord) => {
  const records = results.flatMap((result) => result.records);
  const points = results.flatMap((result) => result.set.points);

  return summarize(records, uniqueMask(points, results[0]!.set.centre), centre);
};

const compactSummary = (summary: SetSummary) =>
  Object.fromEntries(
    Object.entries(summary).map(([key, value]) => [
      key,
      typeof value === 'number' ? Math.round(value * 1e4) / 1e4 : value
    ])
  );

const familySummaries = (results: SetResult[], centre: PointRecord) => {
  const families = [...new Set(results.map((result) => `${result.set.family}|${result.set.perturb.join('+')}`))];

  return families.map((family) => {
    const members = results.filter((result) => `${result.set.family}|${result.set.perturb.join('+')}` === family);

    return {
      family: members[0]!.set.family,
      perturb: members[0]!.set.perturb,
      mode: members[0]!.set.mode,
      scale: members[0]!.set.scale,
      reps: members.map((result) => ({
        id: result.set.id,
        rep: result.set.rep,
        ...compactSummary(result.summary),
        clipping: clippingSummary(result.set.points)
      })),
      pooled: compactSummary(pooledSummary(members, centre)),
      boundMass: boundMass(
        members.flatMap((result) => result.set.points),
        members[0]!.set.perturb
      )
    };
  });
};

// ----- A2: baseline -----

export const runBaseline = async () => {
  const rows: Record<string, unknown>[] = [];
  const ledgers: Record<string, unknown[]> = {};

  for (const windowKey of ['W13', 'W29'] as const) {
    const door = await openDoor('diag', five, `A2 baseline ${windowKey}`, windowKey);
    const lab = new Lab(door);
    const b5 = frozenB5();
    const result = lab.replay(b5, undefined, true);
    const metrics = lab.metricsOf(result);
    const lots = (result.full?.lots ?? []) as unknown as {
      id: number;
      symbol: string;
      entryTime: number;
      exitTime: number;
      exitReason: string;
      entryRawPrice: number;
      exitRawPrice: number;
      gross: number;
      interest: number;
      net: number;
      exitIndex: number;
    }[];

    ledgers[windowKey] = lots.map((lot) => ({
      id: lot.id,
      symbol: lot.symbol,
      entry: new Date(lot.entryTime * 1000).toISOString(),
      exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
      exitReason: lot.exitReason,
      entryRawPrice: lot.entryRawPrice,
      exitRawPrice: lot.exitRawPrice,
      gross: Math.round(lot.gross * 100) / 100,
      interest: Math.round(lot.interest * 100) / 100,
      net: Math.round(lot.net * 100) / 100
    }));
    rows.push({
      window: windowKey,
      last: door.dates[door.lastIndex],
      net: metrics.net,
      realized: metrics.realized,
      unrealized: metrics.unrealized,
      gross: metrics.gross,
      interest: metrics.interest,
      friction: metrics.costs,
      minuteDrawdown: metrics.minuteDrawdown,
      minutePeak: metrics.minuteDrawdownPeak,
      minuteTrough: metrics.minuteDrawdownTrough,
      dailyDrawdown: metrics.dailyDrawdown,
      dailyPeak: metrics.dailyDrawdownPeak,
      dailyTrough: metrics.dailyDrawdownTrough,
      lots: metrics.lots,
      open: metrics.open,
      virtualTrades: result.decisions,
      granted: result.granted,
      refused: result.refused,
      bySymbol: metrics.bySymbol,
      occupancy: metrics.exposure,
      heldDays: metrics.heldDays,
      periods: metrics.periods
    });
    log(`A2 ${windowKey}: net ${metrics.net.toFixed(2)} DD ${metrics.minuteDrawdown.toFixed(2)} lots ${metrics.lots}`);
  }

  // Reconciliation W13 → W29: lots present in both, closed after W13, opened after W13.
  const key = (lot: Record<string, unknown>) => `${lot.symbol}|${lot.entry}`;
  const w13 = new Map((ledgers.W13 as Record<string, unknown>[]).map((lot) => [key(lot), lot]));
  const reconciliation = (ledgers.W29 as Record<string, unknown>[]).map((lot) => {
    const before = w13.get(key(lot));

    return {
      symbol: lot.symbol,
      entry: lot.entry,
      exitW29: lot.exit,
      netW29: lot.net,
      exitW13: before?.exit ?? 'not yet entered',
      netW13: before?.net ?? 0,
      change: (lot.net as number) - ((before?.net as number) ?? 0)
    };
  });
  const changed = reconciliation.filter((row) => Math.abs(row.change) > 0.004);
  const record = await writeSealed(resultFile('partA', 'A2-baseline.json'), {
    stage: 'A2-baseline',
    at: nowIso(),
    rows,
    reconciliation: {
      changedLots: changed,
      sumOfChanges: changed.reduce((total, row) => total + row.change, 0),
      netChange: (rows[1]!.net as number) - (rows[0]!.net as number)
    },
    ledgers
  });

  log(`A2: ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

// ----- A3: neighbourhoods -----

const lineRows = (lab: Lab, centre: Books, symbol: string, scale: number, extraX?: number) => {
  const rows: Record<string, unknown>[] = [];

  for (const key of d1Keys) {
    const values = lineOf(centre[symbol]!, key, scale, key === 'targetPercentChange' && extraX ? extraX : undefined);

    for (const { value, grid } of values) {
      const record = lab.point({ ...centre, [symbol]: grid });

      rows.push({
        kind: 'line',
        symbol,
        key,
        value,
        offset: value - centre[symbol]![key],
        net: record.net,
        dd: record.dd,
        ddDaily: record.ddDaily,
        ddTrough: record.ddTrough,
        lots: record.lots,
        kreLots: record.kreLots,
        interest: record.interest,
        DEV: record.periods.DEV ?? '',
        VAL: record.periods.VAL ?? '',
        FX: record.periods.FX ?? '',
        signature: record.signature
      });
    }
  }

  return rows;
};

export const runNeighbourhoods = async (windowKey: WindowKey) => {
  const started = Date.now();
  const door = await openDoor('diag', five, `A3 neighbourhoods ${windowKey}`, windowKey);
  const lab = new Lab(door);
  const b5 = frozenB5();
  const centre = lab.point(b5);
  const all = windowKey === 'WDEV';
  const named: NamedSet[] = all
    ? [...jointSets(b5, ['joint-clip']), ...bookSets(b5, ['book-clip'])]
    : [...jointSets(b5), ...bookSets(b5), ...kreSets(b5), ...pairSets(b5)];
  const results: SetResult[] = [];

  for (const set of named) {
    results.push(evaluateSet(lab, set, centre));

    if (results.length % 10 === 0) {
      log(
        `A3 ${windowKey}: ${results.length}/${named.length} sets, ${lab.runs} runs, ${((Date.now() - started) / 1000).toFixed(0)} s`
      );
    }
  }

  const dir = resultFile('partA', 'A3', windowKey);
  const files: Record<string, unknown> = {};
  const byFamily = new Map<string, SetResult[]>();

  for (const result of results) {
    const family = result.set.family.startsWith('kre-freeze') ? 'kre-freeze' : result.set.family;

    byFamily.set(family, [...(byFamily.get(family) ?? []), result]);
  }

  for (const [family, members] of byFamily) {
    files[family] = await writeCsv(`${dir}/${family}.csv`, members.flatMap(rowsOf));
  }

  // Probes and lines (not on WDEV).
  let probeRows: Record<string, unknown>[] = [];
  let linesRows: Record<string, unknown>[] = [];

  if (!all) {
    for (const symbol of five) {
      const { probes, dropped } = probesOf(b5[symbol]!);

      probeRows.push(
        ...probes.map((probe) => {
          const record = lab.point({ ...b5, [symbol]: probe.grid });

          return {
            kind: 'probe',
            symbol,
            key: probe.key,
            offset: probe.offset,
            value: probe.grid[probe.key],
            net: record.net,
            dd: record.dd,
            ddDaily: record.ddDaily,
            ddTrough: record.ddTrough,
            lots: record.lots,
            kreLots: record.kreLots,
            DEV: record.periods.DEV ?? '',
            VAL: record.periods.VAL ?? '',
            FX: record.periods.FX ?? '',
            signature: record.signature
          };
        }),
        ...dropped.map((probe) => ({
          kind: 'probe-out-of-box',
          symbol,
          key: probe.key,
          offset: probe.offset,
          value: probe.value
        }))
      );
      linesRows.push(...lineRows(lab, b5, symbol, symbol === 'KRE' ? 2 : 1, symbol === 'KRE' ? 269 : undefined));
    }

    files.probes = await writeCsv(`${dir}/probes.csv`, probeRows);
    files.lines = await writeCsv(`${dir}/lines.csv`, linesRows);
  }

  const record = await writeSealed(resultFile('partA', `A3-${windowKey}.json`), {
    stage: `A3-neighbourhoods-${windowKey}`,
    at: nowIso(),
    window: { key: windowKey, first: door.dates[0], last: door.dates[door.lastIndex], sessions: door.dates.length },
    centre,
    families: familySummaries(results, centre),
    probes: probeRows.length ? { count: probeRows.filter((row) => row.kind === 'probe').length } : undefined,
    files,
    runs: lab.runs,
    traces: lab.ev.traces,
    seconds: (Date.now() - started) / 1000
  });

  probeRows = [];
  linesRows = [];
  log(
    `A3 ${windowKey}: ${lab.runs} runs in ${((Date.now() - started) / 1000).toFixed(0)} s; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );
};

// ----- A4: KRE attribution, the joint decomposition (reset / only variants) -----

export const runDecomposition = async (windowKey: WindowKey) => {
  const started = Date.now();
  const door = await openDoor('diag', five, `A4 joint decomposition ${windowKey}`, windowKey);
  const lab = new Lab(door);
  const b5 = frozenB5();
  const centre = lab.point(b5);
  const rows: Record<string, unknown>[] = [];

  for (const set of jointSets(b5, ['joint-clip'])) {
    const unique = uniqueMask(set.points, b5);

    set.points.forEach((point, index) => {
      const joint = lab.point(point.books);
      const row: Record<string, unknown> = {
        set: set.id,
        rep: set.rep,
        index,
        unique: unique[index] ? 1 : 0,
        dd: joint.dd,
        net: joint.net,
        ddTrough: joint.ddTrough,
        signature: joint.signature
      };

      for (const symbol of five) {
        const reset = lab.point(resetBook(point, b5, symbol).books);
        const only = lab.point(onlyBook(point, b5, symbol).books);

        row[`reset${symbol}.dd`] = reset.dd;
        row[`reset${symbol}.net`] = reset.net;
        row[`only${symbol}.dd`] = only.dd;
        row[`only${symbol}.net`] = only.net;
      }

      rows.push(row);
    });
  }

  const unique = rows.filter((row) => row.unique === 1);
  const breaches = unique.filter((row) => (row.dd as number) >= ceiling);
  const importance = Object.fromEntries(
    five.map((symbol) => {
      const removed = breaches.filter((row) => (row[`reset${symbol}.dd`] as number) < ceiling).length;
      const onlySufficient = breaches.filter((row) => (row[`only${symbol}.dd`] as number) >= ceiling).length;

      return [
        symbol,
        {
          breachesRemovedByReset: removed,
          importance: breaches.length ? removed / breaches.length : 0,
          onlyBookSufficient: onlySufficient,
          onlyBookBreachShareAll:
            unique.filter((row) => (row[`only${symbol}.dd`] as number) >= ceiling).length / unique.length,
          resetShareBelow: unique.filter((row) => (row[`reset${symbol}.dd`] as number) < ceiling).length / unique.length
        }
      ];
    })
  );
  const classes = {
    kreOnlySufficient: breaches.filter((row) => (row['onlyKRE.dd'] as number) >= ceiling).length,
    needsKre: breaches.filter((row) => (row['resetKRE.dd'] as number) < ceiling).length,
    withoutKre: breaches.filter((row) => (row['resetKRE.dd'] as number) >= ceiling).length,
    noSingleBookSufficient: breaches.filter((row) =>
      five.every((symbol) => (row[`only${symbol}.dd`] as number) < ceiling)
    ).length
  };
  const file = await writeCsv(resultFile('partA', 'A4', `decomposition-${windowKey}.csv`), rows);
  const record = await writeSealed(resultFile('partA', `A4-decomposition-${windowKey}.json`), {
    stage: `A4-decomposition-${windowKey}`,
    at: nowIso(),
    window: { key: windowKey, last: door.dates[door.lastIndex] },
    centre: { net: centre.net, dd: centre.dd },
    points: rows.length,
    unique: unique.length,
    breaches: breaches.length,
    importance,
    classes,
    file,
    runs: lab.runs,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `A4 ${windowKey}: ${breaches.length} breaches of ${unique.length}; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );
};

// ----- A5: B1 (VGT primary alone) -----

export const runB1 = async () => {
  const out: Record<string, unknown>[] = [];

  for (const windowKey of ['W23', 'W29'] as const) {
    const door = await openDoor('diag', ['VGT'], `A5 B1 ${windowKey}`, windowKey);
    const lab = new Lab(door);
    const centre = lab.point(b1Centre());
    const results = b1Sets().map((set) => evaluateSet(lab, set, centre));
    const probes = probesOf(frozenGrids.VGT).probes.map((probe) => {
      const record = lab.point({ VGT: probe.grid });

      return { key: probe.key, offset: probe.offset, net: record.net, dd: record.dd };
    });

    await writeCsv(resultFile('partA', 'A5', `b1-${windowKey}.csv`), results.flatMap(rowsOf));
    out.push({
      window: windowKey,
      last: door.dates[door.lastIndex],
      centre,
      families: familySummaries(results, centre),
      probes,
      probeShareBelow: probes.filter((probe) => probe.dd < ceiling).length / probes.length
    });
    log(`A5 B1 ${windowKey}: centre ${centre.net} / ${centre.dd}`);
  }

  const record = await writeSealed(resultFile('partA', 'A5-b1.json'), { stage: 'A5-b1', at: nowIso(), windows: out });

  log(`A5: ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

// ----- A6: ablations -----

export const runAblations = async () => {
  const rows: Record<string, unknown>[] = [];

  for (const windowKey of ['W23', 'W29'] as const) {
    const door = await openDoor('diag', five, `A6 ablations ${windowKey}`, windowKey);
    const lab = new Lab(door);
    const b5 = frozenB5();
    const base = lab.replay(b5);
    const baseLots = lab.ev.lotsOf(base);
    const lotKey = (lot: { symbol: string; entryTime: number }) => `${lot.symbol}|${lot.entryTime}`;
    const decompose = (label: string, result: ReturnType<Lab['replay']>, removed: string) => {
      const metrics = lab.metricsOf(result);
      const lots = lab.ev.lotsOf(result);
      const keys = new Set(lots.map(lotKey));
      const baseKeys = new Set(baseLots.map(lotKey));
      const ownLost = baseLots.filter((lot) => lot.symbol === removed).reduce((total, lot) => total + lot.net, 0);
      const gained = lots.filter((lot) => !baseKeys.has(lotKey(lot))).reduce((total, lot) => total + lot.net, 0);
      const displaced = baseLots
        .filter((lot) => lot.symbol !== removed && !keys.has(lotKey(lot)))
        .reduce((total, lot) => total + lot.net, 0);

      return {
        window: windowKey,
        scenario: label,
        net: metrics.net,
        dd: metrics.minuteDrawdown,
        ddPeak: metrics.minuteDrawdownPeak,
        ddTrough: metrics.minuteDrawdownTrough,
        ddDaily: metrics.dailyDrawdown,
        lots: metrics.lots,
        interest: metrics.interest,
        occupancy: metrics.exposure,
        signature: sha256(JSON.stringify(result.lots.map((lot) => [lot.symbol, lot.entryTime, lot.exitTime, lot.net]))),
        deltaVsB5: metrics.net - base.net,
        decomposition: {
          removedBookOwnNet: -ownLost,
          otherBooksGainedLots: gained,
          otherBooksDisplacedLots: -displaced,
          residual: metrics.net - base.net - (-ownLost + gained - displaced)
        },
        bySymbol: metrics.bySymbol
      };
    };

    rows.push(decompose('B5 (frozen)', base, ''));

    for (const symbol of five) {
      const without = Object.fromEntries(Object.entries(b5).filter(([s]) => s !== symbol));

      rows.push(decompose(`B5 − ${symbol} (book absent)`, lab.replay(without), symbol));
    }

    rows.push(
      decompose(
        'B5 with KRE recorded but never funded',
        lab.replayWithheld(b5, (symbol) => symbol === 'KRE'),
        'KRE'
      )
    );

    const kreAlone = lab.point({ KRE: b5.KRE! });

    rows.push({
      window: windowKey,
      scenario: 'KRE alone in the pool',
      net: kreAlone.net,
      dd: kreAlone.dd,
      lots: kreAlone.lots
    });
    log(`A6 ${windowKey}: done`);
  }

  const equivalent = ['W23', 'W29'].map((windowKey) => {
    const absent = rows.find((row) => row.window === windowKey && row.scenario === 'B5 − KRE (book absent)')!;
    const withheld = rows.find(
      (row) => row.window === windowKey && row.scenario === 'B5 with KRE recorded but never funded'
    )!;

    return { window: windowKey, identicalLedger: absent.signature === withheld.signature, absent: absent.signature };
  });
  const record = await writeSealed(resultFile('partA', 'A6-ablations.json'), {
    stage: 'A6-ablations',
    at: nowIso(),
    rows,
    kreAbsentEqualsNeverFunded: equivalent
  });

  log(`A6: ${JSON.stringify(equivalent)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

export type { Grid };
export const quantileOf = quantile;
