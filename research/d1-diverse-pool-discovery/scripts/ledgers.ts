// Supplementary, descriptive outputs the full brief (§14) asks for: machine-readable trade ledgers, per-member and
// per-year metrics. It changes no sealed record and decides nothing; every figure is first reconciled with the sealed
// number it elaborates (to 1e-6), and the script stops on any difference.
//
//   folds  — the sealed fold picks (J/T/Q primaries and alternates) and B1/B4/B5 on each fold's validation run, through
//            the same validation door the sealed `validate` stage used (it requires the sealed PICKS.json). Reconciled
//            with validation.json's V at 5 bps. Written after PROCEDURE_GATE.json was sealed.
//   final  — every final-round finalist of every arm and B1/B4/B5 on the 2016–2023 training window (training door
//            only; nothing after 2023-12-29 is read). Reconciled with the stored assessment's centre net at 5 bps.
//
// Run from the repository root (heap as the study's command):
//   node --max-old-space-size=12288 --experimental-transform-types \
//     research/d1-diverse-pool-discovery/scripts/ledgers.ts folds|final
import fs from 'fs-extra';
import path from 'node:path';
import { searchBenchmarkBooks } from '../../../src/joint-16-etf-d1/benchmarks.ts';
import { RobustEvaluator } from '../../../src/d1-robust/evaluator.ts';
import type { Book } from '../../../src/d1-robust/neighbourhood.ts';
import type { LoadedUniverse } from '../../../src/portfolio-aware-d1/nbook/universe.ts';
import { armsOf, readJson, stageDir, study, writeJson, type FoldKey } from '../../../src/d1-diverse/context.ts';
import { eligibleSymbols, picksFile, trainingUniverse, validationUniverse } from '../../../src/d1-diverse/data.ts';
import { readSealed } from '../../../src/d1-diverse/freeze.ts';
import { selectDir } from '../../../src/d1-diverse/round.ts';
import { validationFile } from '../../../src/d1-diverse/walkforward.ts';

type StoredBook = { symbol: string; id: string; grid: Book['vector']['grid']; origin: string };

const booksOf = (books: StoredBook[]): Book[] =>
  books.map((book) => ({ symbol: book.symbol, vector: { id: book.id, grid: book.grid, origin: book.origin } }));

const outDir = stageDir('ledgers');
const costBps = study.principalCostBps;
const tolerance = 1e-6;
const iso = (seconds: number) => (seconds > 0 ? new Date(seconds * 1000).toISOString() : null);

// The strategy mark at the last session of each calendar year (and at the window's end), and the yearly change.
const yearly = (loaded: LoadedUniverse, marks: Float64Array, fromIndex: number, toIndex: number) => {
  const { dates } = loaded.universe;
  const rows: { year: string; from: string; to: string; change: number }[] = [];
  let start = fromIndex;

  for (let index = fromIndex + 1; index <= toIndex; index += 1) {
    const last = index === toIndex || dates[index + 1]!.slice(0, 4) !== dates[index]!.slice(0, 4);

    if (last) {
      rows.push({ year: dates[index]!.slice(0, 4), from: dates[start]!, to: dates[index]!, change: marks[index]! - marks[start]! });
      start = index;
    }
  }

  return rows;
};

const ledgerOf = (evaluator: RobustEvaluator, loaded: LoadedUniverse, books: Book[]) => {
  const detail = evaluator.replayDetail(books, costBps);
  const { dates } = loaded.universe;
  const lotTotal = detail.lots.reduce((total, lot) => total + lot.net, 0);

  if (Math.abs(lotTotal - detail.net) > tolerance) {
    throw new Error(`the lots' net ${lotTotal} does not sum to the run's net ${detail.net}`);
  }

  const lots = detail.lots.map((lot) => ({
    id: lot.id,
    symbol: lot.symbol,
    entryDate: dates[lot.entryIndex] ?? null,
    entryTime: iso(lot.entryTime),
    exitDate: lot.exitIndex >= 0 ? dates[lot.exitIndex]! : null,
    exitTime: lot.exitIndex >= 0 ? iso(lot.exitTime) : null,
    open: lot.open,
    net: lot.net,
    interest: lot.interest,
    costs: lot.costs
  }));
  const members = Object.fromEntries(
    books.map((book) => {
      const own = detail.lots.filter((lot) => lot.symbol === book.symbol);

      return [book.symbol, { lots: own.length, net: own.reduce((total, lot) => total + lot.net, 0) }];
    })
  );

  return { detail, lots, members };
};

const csvOf = (lots: ReturnType<typeof ledgerOf>['lots']) =>
  [
    'id,symbol,entryDate,entryTime,exitDate,exitTime,open,net,interest,costs',
    ...lots.map((lot) =>
      [lot.id, lot.symbol, lot.entryDate, lot.entryTime, lot.exitDate ?? '', lot.exitTime ?? '', lot.open, lot.net, lot.interest, lot.costs].join(',')
    )
  ].join('\n') + '\n';

const runFolds = async () => {
  const universe = await eligibleSymbols();
  const benchmarks = await searchBenchmarkBooks();

  for (const fold of ['fold-a', 'fold-b'] as FoldKey[]) {
    const file = path.join(outDir, `${fold}-validation-attribution.json`);

    if (await fs.pathExists(file)) {
      throw new Error(`${file} exists`);
    }

    const picks = await readSealed(picksFile(fold));
    const validation = await readSealed(validationFile(fold));
    const sealedRows = new Map(
      (validation.rows as { label: string; key: string; validation: Record<string, number> }[]).map((row) => [row.label, row])
    );
    const loaded = await validationUniverse(fold, universe);
    const evaluator = await RobustEvaluator.create(loaded, study.neighbourWindowLabel(fold), 0);
    const splitIndex = loaded.universe.dates.filter((date) => date <= study.windows[fold].searchEnd).length - 1;
    const endIndex = evaluator.window.endIndex;
    const rows: { label: string; books: Book[]; members: string[] }[] = [];
    const pickSet = picks.picks as Record<string, { primary: { books: StoredBook[]; members: string[] } | null; alternates: { role: string; books: StoredBook[]; members: string[] }[] }>;

    for (const procedure of ['J', 'T', 'Q']) {
      const item = pickSet[procedure]!;

      if (item.primary) {
        rows.push({ label: `${procedure} primary`, books: booksOf(item.primary.books), members: item.primary.members });
      }

      for (const alternate of item.alternates) {
        rows.push({ label: `${procedure} ${alternate.role}`, books: booksOf(alternate.books), members: alternate.members });
      }
    }

    for (const key of ['B1', 'B4', 'B5'] as const) {
      rows.push({ label: key, books: benchmarks[key], members: benchmarks[key].map((book) => book.symbol) });
    }

    const out: Record<string, unknown> = {};

    for (const row of rows) {
      const { detail, lots, members } = ledgerOf(evaluator, loaded, row.books);
      const v = detail.marks[endIndex]! - detail.marks[splitIndex]!;
      const sealed = sealedRows.get(row.label)!.validation[String(costBps)]!;

      if (Math.abs(v - sealed) > tolerance) {
        throw new Error(`${fold} ${row.label}: V ${v} differs from the sealed ${sealed}`);
      }

      out[row.label] = {
        members: row.members,
        validationV5: v,
        reconciledWith: 'validation.json rows[].validation["5"]',
        byYear: yearly(loaded, detail.marks, splitIndex, endIndex),
        validationLots: lots.filter((lot) => lot.entryDate !== null && lot.entryDate > study.windows[fold].searchEnd),
        carriedAcrossSearchEnd: lots.filter(
          (lot) => lot.entryDate !== null && lot.entryDate <= study.windows[fold].searchEnd && (lot.open || (lot.exitDate ?? '') > study.windows[fold].searchEnd)
        ),
        wholeRunMembers: members
      };
    }

    await evaluator.close();
    await writeJson(file, {
      fold,
      generatedAt: new Date().toISOString(),
      note: 'descriptive only, written after PROCEDURE_GATE.json was sealed; lot net is the whole lot (a carried lot includes its pre-search-end part); costs 5 bps',
      searchEnd: study.windows[fold].searchEnd,
      validationEnd: loaded.universe.dates[endIndex],
      rows: out
    });
    console.info(`wrote ${file}`);
  }
};

const runFinal = async () => {
  const file = path.join(outDir, 'final-finalists.json');

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists`);
  }

  const loaded = await trainingUniverse('final');
  const evaluator = await RobustEvaluator.create(loaded, study.neighbourWindowLabel('final'), 0);
  const startIndex = evaluator.window.startIndex;
  const endIndex = evaluator.window.endIndex;
  const benchmarks = await searchBenchmarkBooks();
  const rows: { label: string; arm: string; books: Book[]; storedNet?: number }[] = [];

  for (const arm of armsOf('final')) {
    const { finalists } = await readJson<{
      finalists: { label: string; books: StoredBook[]; centre: Record<string, { net: number }> }[];
    }>(selectDir('final', arm, 'assessment.json'));

    for (const finalist of finalists) {
      rows.push({ label: finalist.label, arm, books: booksOf(finalist.books), storedNet: finalist.centre[String(costBps)]!.net });
    }
  }

  const benchmarkA = (
    await readJson<{ benchmarks: Record<'B1' | 'B4' | 'B5', { centre: Record<string, { net: number }> }> }>(
      selectDir('final', 'benchmarks.json')
    )
  ).benchmarks;

  for (const key of ['B1', 'B4', 'B5'] as const) {
    rows.push({ label: key, arm: 'benchmark', books: benchmarks[key], storedNet: benchmarkA[key].centre[String(costBps)]!.net });
  }

  await fs.ensureDir(path.join(outDir, 'final'));

  const out: Record<string, unknown> = {};

  for (const row of rows) {
    const { detail, lots, members } = ledgerOf(evaluator, loaded, row.books);

    if (row.storedNet !== undefined && Math.abs(detail.net - row.storedNet) > tolerance) {
      throw new Error(`${row.label}: net ${detail.net} differs from the stored assessment ${row.storedNet}`);
    }

    const ledger = path.join(outDir, 'final', `${row.label}.csv`);

    await fs.writeFile(ledger, csvOf(lots));
    out[row.label] = {
      arm: row.arm,
      members: row.books.map((book) => ({ symbol: book.symbol, id: book.vector.id, grid: book.vector.grid })),
      net5: detail.net,
      minuteDrawdown5: detail.minuteDrawdown.maximum,
      lots: lots.length,
      reconciledWith: row.arm === 'benchmark' ? 'select/benchmarks.json centre["5"].net' : 'assessment.json centre["5"].net',
      byYear: yearly(loaded, detail.marks, startIndex, endIndex),
      byMember: members,
      ledgerCsv: ledger
    };
  }

  await evaluator.close();
  await writeJson(file, {
    window: 'final (training 2016-01-04 → 2023-12-29)',
    generatedAt: new Date().toISOString(),
    note: 'descriptive only; training door; costs 5 bps; lot net includes its costs and interest',
    rows: out
  });
  console.info(`wrote ${file}`);
};

const mode = process.argv[2];

if (mode === 'folds') {
  await runFolds();
} else if (mode === 'final') {
  await runFinal();
} else {
  throw new Error('usage: ledgers.ts folds|final');
}
