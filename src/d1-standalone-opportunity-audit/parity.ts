// Stage A parity (PROTOCOL.md §4.3; the preregistered results/parity/PARITY_SAMPLE.json, written before any run):
//
//   1. stored source vectors: every sampled representative or library alternative re-executed through the frozen
//      N-book engine at its original cutoff, 5 bps and 11%, against the stored Stage A metrics (counts exact, money to
//      the cent, the source's liquidation-equivalent definition for a lot open at the cutoff), plus data identity: the
//      canonical file hash and the loaded-bars hash equal the profile's;
//   2. the sealed same-window controls (CONTROLS.json final): VGT primary (B1), B5 (A) and B4 at 0/2/5/10 bps fixed,
//      and their 20% portfolios at 5 bps;
//   3. the brief's full-history anchors of S, B4, B5 and C0 (2016-01-04 → 2026-10-13), to the cent and 0.01 pp;
//   4. causality: VGT primary and the GDX final representative re-run through 2022-06-30 close exactly the lots the
//      2023-12-29 runs close by then (no later bar changes an earlier outcome).
//
// Any failure throws after writing the record (fail closed): no strategy comparison may proceed on a mismatch.
import path from 'node:path';
import fs from 'fs-extra';
import { readSealed } from '../d1-ranked-preemption/freeze.ts';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { loadPool } from '../pools/load.ts';
import {
  type WindowKey,
  base,
  costScenarios,
  fullHistoryAnchors,
  jsonReplacer,
  log,
  nowIso,
  poolMembers,
  readJson,
  resultDir,
  sourceResults,
  sourceStandaloneRoot,
  windows
} from './context.ts';
import { candidateUniverse, foldUniverse, fullHistoryUniverse } from './data.ts';
import type { Grid, StoredMetrics } from './inventory.ts';
import { type Book, type RunRecord, type Spec, executeSpec } from './run.ts';
import { atCost, gridKeyOf, specOf, vgtPrimary } from './specs.ts';

export const sampleFile = resultDir('parity', 'PARITY_SAMPLE.json');
export const parityFile = resultDir('parity', 'PARITY.json');

interface Check {
  group: string;
  name: string;
  pass: boolean;
  detail: string;
}

const cent = 0.01;
const close = (a: number | null | undefined, b: number | null | undefined, tolerance = cent) =>
  (a === null || a === undefined || Number.isNaN(a)) && (b === null || b === undefined || Number.isNaN(b))
    ? true
    : typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tolerance;

export const loadPoolBooks = async (): Promise<Record<'B4' | 'B5', Book[]>> => {
  const books = {} as Record<'B4' | 'B5', Book[]>;

  for (const id of ['B4', 'B5'] as const) {
    const loaded = await loadPool(id);

    books[id] = loaded.config.books.map((book) => ({
      symbol: book.symbol,
      phenotype: book.phenotype,
      grid: Object.fromEntries(d1Keys.map((key) => [key, book.grid[key]])) as Grid
    }));
  }

  return books;
};

const fixedSpec = (key: string, subject: string, window: Spec['window'], books: Book[]) =>
  specOf({ key, family: 'parity', subject, window, mode: 'fixed', books, meta: {} });

// Stored fields compared one by one (tolerances from the preregistered sample).
export const storedChecks = (label: string, record: Pick<RunRecord, 'view'>, stored: StoredMetrics): Check[] => {
  const view = record.view;
  const checks: Check[] = [];
  const exact = (name: string, ours: number, theirs: number) =>
    checks.push({ group: 'stored', name: `${label} ${name}`, pass: ours === theirs, detail: `${ours} vs ${theirs}` });
  const money = (name: string, ours: number, theirs: number | null, tolerance = cent) =>
    checks.push({
      group: 'stored',
      name: `${label} ${name}`,
      pass: close(ours, theirs, tolerance),
      detail: `${ours.toFixed(4)} vs ${theirs === null ? 'null' : theirs.toFixed(4)}`
    });

  exact('trades', view.trades, stored.trades);
  exact('closed', view.closed, stored.closed);
  exact('open at the cutoff', view.open, stored.open);
  exact('wins', view.wins, stored.wins);
  exact('losses', view.losses, stored.losses);
  money('net (liquidation-equivalent)', view.net, stored.net);
  money('interest', view.interest, stored.interest);
  money('friction', view.friction, stored.friction);
  money('best trade', view.bestTrade, stored.bestTrade);
  money('second trade', view.secondTrade, stored.secondTrade);
  money('third trade', view.thirdTrade, stored.thirdTrade);
  money('worst trade', view.worstTrade, stored.worstTrade);
  money('mean net', view.meanNet, stored.meanNet);
  money('median net', view.medianNet, stored.medianNet);
  money('loss sum', view.lossSum, stored.lossSum);
  money('occupied days', view.occupiedDays, stored.occupiedDays, 1e-6);
  money('minute drawdown', view.minuteDrawdown, stored.minuteDrawdown);
  money('daily drawdown', view.dailyDrawdown, stored.dailyDrawdown);

  const years = [...new Set([...Object.keys(view.yearly), ...Object.keys(stored.yearly)])].sort();
  const yearMismatches = years.filter((year) => !close(view.yearly[year] ?? 0, stored.yearly[year] ?? 0));

  checks.push({
    group: 'stored',
    name: `${label} nets by exit year`,
    pass: yearMismatches.length === 0,
    detail: yearMismatches.length === 0 ? `${years.length} years equal` : `differ: ${yearMismatches.join(', ')}`
  });

  return checks;
};

interface SampleVector {
  window: WindowKey;
  symbol: string;
  role: string;
}

const storedVectorOf = async (vector: SampleVector) => {
  const profile = await readJson<{
    representative: { grid: Grid; metrics: StoredMetrics; candidateId: string };
    library: { role: string; file: string; candidateId: string }[];
    data: { dataSha256: string; loadedBarsSha256: string };
  }>(path.join(sourceStandaloneRoot, vector.window, `${vector.symbol}.json`));
  const entry = profile.library.find((item) => item.role === vector.role);

  if (!entry) {
    throw new Error(`${vector.window} ${vector.symbol} has no library role ${vector.role}`);
  }

  const phenotype = await readJson<{ grid: Grid; metrics: StoredMetrics; candidateId: string }>(entry.file);

  if (vector.role === 'representative' && gridKeyOf(phenotype.grid) !== gridKeyOf(profile.representative.grid)) {
    throw new Error(`${vector.symbol}: the representative file's grid differs from the profile's`);
  }

  return { grid: phenotype.grid, metrics: phenotype.metrics, candidateId: entry.candidateId, data: profile.data };
};

export const runParity = async () => {
  const startedAt = nowIso();
  const sample = await readJson<{ vectors: SampleVector[] }>(sampleFile);
  const checks: Check[] = [];
  const records: Record<string, unknown> = {};
  const pools = await loadPoolBooks();

  // ----- 1. stored source vectors at their original cutoffs -----

  for (const window of ['final', 'fold-a', 'fold-b'] as const) {
    const vectors = sample.vectors.filter((vector) => vector.window === window);

    if (vectors.length === 0) {
      continue;
    }

    const symbols = [...new Set(vectors.map((vector) => vector.symbol))];
    const cutoff = windows[window].searchEnd;
    const loaded =
      window === 'final' ? await candidateUniverse(symbols, cutoff) : await foldUniverse(window, symbols, cutoff);

    log(`parity: ${window} loaded through ${loaded.door.lastDate} (${symbols.join(' ')})`);

    for (const vector of vectors) {
      const stored = await storedVectorOf(vector);
      const label = `${window} ${vector.symbol} ${vector.role} ${stored.candidateId}`;
      const record = executeSpec(
        loaded.universe,
        fixedSpec(`parity:${window}:${vector.symbol}:${vector.role}`, label, window, [
          { symbol: vector.symbol, phenotype: stored.candidateId, grid: stored.grid }
        ])
      );

      checks.push({
        group: 'data',
        name: `${label} canonical file hash`,
        pass: loaded.door.dataSha256[vector.symbol] === stored.data.dataSha256,
        detail: `${loaded.door.dataSha256[vector.symbol]?.slice(0, 12)} vs ${stored.data.dataSha256.slice(0, 12)}`
      });
      checks.push({
        group: 'data',
        name: `${label} loaded-bars hash (through ${cutoff})`,
        pass: loaded.door.loadedBarsSha256[vector.symbol] === stored.data.loadedBarsSha256,
        detail: `${loaded.door.loadedBarsSha256[vector.symbol]?.slice(0, 12)} vs ${stored.data.loadedBarsSha256.slice(0, 12)}`
      });
      checks.push({
        group: 'data',
        name: `${label} grid identity`,
        pass: gridKeyOf(record.books[0]!.grid) === gridKeyOf(stored.grid),
        detail: gridKeyOf(stored.grid)
      });
      checks.push(...storedChecks(label, record, stored.metrics));
      records[label] = { view: record.view, lots: record.lots.length, endDate: record.endDate };
    }
  }

  // ----- 2. the sealed same-window controls -----

  const controls = await readSealed<{
    fixed: Record<string, Record<string, Record<string, number>>>;
    portfolio: Record<string, Record<string, number>>;
    bodyHash: string;
  }>(sourceResults('controls', 'final', 'CONTROLS.json'));
  const finalLoaded = await candidateUniverse([...poolMembers]);
  const controlBooks: Record<'B1' | 'A' | 'B4', Book[]> = {
    B1: [{ symbol: 'VGT', phenotype: vgtPrimary.id, grid: vgtPrimary.grid }],
    A: pools.B5,
    B4: pools.B4
  };

  for (const id of ['B1', 'A', 'B4'] as const) {
    for (const costBps of [0, 2, 5, 10]) {
      const stored = controls.fixed[id]![String(costBps)]!;
      const record = executeSpec(
        finalLoaded.universe,
        atCost(fixedSpec(`parity:control:${id}`, `control ${id}`, 'final', controlBooks[id]), costBps)
      );
      const label = `control ${id} fixed ${costBps} bps (2016-01-04 → 2023-12-29)`;
      const heldDays = record.lots.reduce((total, lot) => total + lot.heldDays, 0);

      checks.push(
        {
          group: 'controls',
          name: `${label} lots`,
          pass: record.view.trades === stored.lots,
          detail: `${record.view.trades} vs ${stored.lots}`
        },
        {
          group: 'controls',
          name: `${label} net (liquidation-equivalent)`,
          pass: close(record.view.net, stored.net),
          detail: `${record.view.net.toFixed(4)} vs ${stored.net!.toFixed(4)}`
        },
        {
          group: 'controls',
          name: `${label} engine net`,
          pass: close(record.metrics.net, stored.engineNet),
          detail: `${record.metrics.net.toFixed(4)} vs ${stored.engineNet!.toFixed(4)}`
        },
        {
          group: 'controls',
          name: `${label} minute drawdown`,
          pass: close(record.view.minuteDrawdown, stored.minuteDrawdown),
          detail: `${record.view.minuteDrawdown.toFixed(4)} vs ${stored.minuteDrawdown!.toFixed(4)}`
        },
        {
          group: 'controls',
          name: `${label} daily drawdown`,
          pass: close(record.view.dailyDrawdown, stored.dailyDrawdown),
          detail: `${record.view.dailyDrawdown.toFixed(4)} vs ${stored.dailyDrawdown!.toFixed(4)}`
        },
        {
          group: 'controls',
          name: `${label} interest`,
          pass: close(record.view.interest, stored.interest),
          detail: `${record.view.interest.toFixed(4)} vs ${stored.interest!.toFixed(4)}`
        },
        {
          group: 'controls',
          name: `${label} friction`,
          pass: close(record.view.friction, stored.costs),
          detail: `${record.view.friction.toFixed(4)} vs ${stored.costs!.toFixed(4)}`
        },
        {
          group: 'controls',
          name: `${label} held calendar days`,
          pass: close(heldDays, stored.heldDays, 1e-6),
          detail: `${heldDays} vs ${stored.heldDays}`
        }
      );
    }

    const storedPortfolio = controls.portfolio[id]!;
    const portfolio = executeSpec(
      finalLoaded.universe,
      specOf({
        key: `parity:control:${id}:portfolio`,
        family: 'parity',
        subject: `control ${id}`,
        window: 'final',
        mode: 'portfolio',
        books: controlBooks[id],
        meta: {}
      })
    );
    const label = `control ${id} portfolio 5 bps (2016-01-04 → 2023-12-29)`;
    const borrowing = portfolio.metrics.interest * (365 / base.rate);

    checks.push(
      {
        group: 'controls',
        name: `${label} end equity`,
        pass: close(portfolio.metrics.endEquity, storedPortfolio.endEquity),
        detail: `${portfolio.metrics.endEquity.toFixed(4)} vs ${storedPortfolio.endEquity!.toFixed(4)}`
      },
      {
        group: 'controls',
        name: `${label} max daily % drawdown`,
        pass: close(portfolio.metrics.dailyPercent, storedPortfolio.dailyPercentDrawdown, 1e-9),
        detail: `${portfolio.metrics.dailyPercent} vs ${storedPortfolio.dailyPercentDrawdown}`
      },
      {
        group: 'controls',
        name: `${label} strategy net`,
        pass: close(portfolio.metrics.net, storedPortfolio.strategyNet),
        detail: `${portfolio.metrics.net.toFixed(4)} vs ${storedPortfolio.strategyNet!.toFixed(4)}`
      },
      {
        group: 'controls',
        name: `${label} lots`,
        pass: portfolio.metrics.lots === storedPortfolio.lots,
        detail: `${portfolio.metrics.lots} vs ${storedPortfolio.lots}`
      },
      {
        group: 'controls',
        name: `${label} borrowing dollar-days`,
        pass: close(borrowing, storedPortfolio.borrowingDollarDays, 1),
        detail: `${borrowing.toFixed(2)} vs ${storedPortfolio.borrowingDollarDays!.toFixed(2)}`
      }
    );
  }

  // ----- 3. the brief's full-history anchors -----

  const full = await fullHistoryUniverse();
  const fullBooks: Record<'S' | 'B4' | 'B5', Book[]> = { S: controlBooks.B1, B4: pools.B4, B5: pools.B5 };
  const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

  for (const id of ['S', 'B4', 'B5'] as const) {
    const anchor = fullHistoryAnchors[id];
    const fixed = executeSpec(full.universe, { ...fixedSpec(`parity:full:${id}`, id, 'all', fullBooks[id]) });
    const portfolio = executeSpec(
      full.universe,
      specOf({
        key: `parity:full:${id}:portfolio`,
        family: 'parity',
        subject: id,
        window: 'all',
        mode: 'portfolio',
        books: fullBooks[id],
        meta: {}
      })
    );
    const label = `${id} full history 2016-01-04 → 2026-10-13`;

    checks.push(
      {
        group: 'anchors',
        name: `${label} fixed net`,
        pass: round(fixed.metrics.net, 2) === anchor.net,
        detail: `${round(fixed.metrics.net, 2)} vs ${anchor.net}`
      },
      {
        group: 'anchors',
        name: `${label} fixed minute DD`,
        pass: round(fixed.metrics.minuteDD, 2) === anchor.minuteDrawdown,
        detail: `${round(fixed.metrics.minuteDD, 2)} vs ${anchor.minuteDrawdown}`
      },
      {
        group: 'anchors',
        name: `${label} funded lots`,
        pass: fixed.metrics.lots === anchor.lots,
        detail: `${fixed.metrics.lots} vs ${anchor.lots}`
      },
      {
        group: 'anchors',
        name: `${label} portfolio end equity`,
        pass: round(portfolio.metrics.endEquity, 2) === anchor.endEquity,
        detail: `${round(portfolio.metrics.endEquity, 2)} vs ${anchor.endEquity}`
      },
      {
        group: 'anchors',
        name: `${label} portfolio max daily %`,
        pass: round(portfolio.metrics.dailyPercent, 4) === anchor.daily,
        detail: `${round(portfolio.metrics.dailyPercent, 4)} vs ${anchor.daily}`
      },
      {
        group: 'anchors',
        name: `${label} portfolio max minute %`,
        pass: round(portfolio.metrics.minutePercent, 4) === anchor.minute,
        detail: `${round(portfolio.metrics.minutePercent, 4)} vs ${anchor.minute}`
      }
    );
    records[label] = { fixed: fixed.metrics.net, portfolio: portfolio.metrics.endEquity };
  }

  const c0 = executeSpec(
    full.universe,
    specOf({
      key: 'parity:full:C0',
      family: 'parity',
      subject: 'C0',
      window: 'all',
      mode: 'portfolio',
      books: [],
      meta: {}
    })
  );

  checks.push(
    {
      group: 'anchors',
      name: 'C0 full history end equity',
      pass: round(c0.metrics.endEquity, 2) === fullHistoryAnchors.C0.endEquity,
      detail: `${round(c0.metrics.endEquity, 2)} vs ${fullHistoryAnchors.C0.endEquity}`
    },
    {
      group: 'anchors',
      name: 'C0 full history max daily %',
      pass: round(c0.metrics.dailyPercent, 4) === fullHistoryAnchors.C0.daily,
      detail: `${round(c0.metrics.dailyPercent, 4)}`
    },
    {
      group: 'anchors',
      name: 'C0 full history max minute %',
      pass: round(c0.metrics.minutePercent, 4) === fullHistoryAnchors.C0.minute,
      detail: `${round(c0.metrics.minutePercent, 4)}`
    }
  );

  // ----- 4. causality: an earlier cutoff closes the same lots -----

  const gdx = await storedVectorOf({ window: 'final', symbol: 'GDX', role: 'representative' });
  const early = await candidateUniverse(['VGT', 'GDX'], '2022-06-30');
  const causalBooks: Record<string, Book> = {
    'VGT primary': controlBooks.B1[0]!,
    'GDX final representative': { symbol: 'GDX', phenotype: gdx.candidateId, grid: gdx.grid }
  };

  for (const [name, book] of Object.entries(causalBooks)) {
    const late = executeSpec(finalLoaded.universe, fixedSpec(`causality:${name}:late`, name, 'final', [book]));
    const earlyRun = executeSpec(early.universe, fixedSpec(`causality:${name}:early`, name, 'final', [book]));
    const signature = (lot: RunRecord['lots'][number]) =>
      `${lot.entryTime}|${lot.exitTime}|${lot.exitReason}|${lot.net.toFixed(6)}|${lot.entryRawPrice}|${lot.exitRawPrice}`;
    const earlyClosed = earlyRun.lots.filter((lot) => lot.exitIndex >= 0).map(signature);
    const lateClosed = late.lots.filter((lot) => lot.exitIndex >= 0 && lot.exitDate <= '2022-06-30').map(signature);
    const earlyOpen = earlyRun.lots.filter((lot) => lot.exitIndex < 0).map((lot) => lot.entryTime);
    const lateOpenAtCut = late.lots
      .filter((lot) => lot.entryDate <= '2022-06-30' && (lot.exitIndex < 0 || lot.exitDate > '2022-06-30'))
      .map((lot) => lot.entryTime);

    checks.push({
      group: 'causality',
      name: `${name}: the run through 2022-06-30 closes exactly the lots the run through 2023-12-29 closes by then`,
      pass:
        JSON.stringify(earlyClosed) === JSON.stringify(lateClosed) &&
        JSON.stringify(earlyOpen) === JSON.stringify(lateOpenAtCut),
      detail: `${earlyClosed.length} closed, ${earlyOpen.length} open at the cut`
    });
  }

  const failed = checks.filter((check) => !check.pass);
  const record = {
    schema: 'd1-standalone-opportunity-parity',
    schemaVersion: 1,
    startedAt,
    finishedAt: nowIso(),
    node: process.version,
    sample: path.relative('.', sampleFile),
    doors: { final: finalLoaded.door, early: early.door, full: full.door },
    costScenarioBase: costScenarios[0],
    checks,
    passed: checks.length - failed.length,
    failed: failed.length,
    records
  };

  await fs.outputFile(parityFile, `${JSON.stringify(record, jsonReplacer, 1)}\n`);

  for (const check of checks) {
    if (!check.pass) {
      log(`FAIL [${check.group}] ${check.name}: ${check.detail}`);
    }
  }

  log(`parity: ${record.passed}/${checks.length} passed → ${parityFile}`);

  if (failed.length > 0) {
    throw new Error(`${failed.length} parity check(s) failed: the study stops here (fail closed)`);
  }

  return record;
};
