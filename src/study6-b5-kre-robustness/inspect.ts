// Post-study inspection commands (RUN_COMMANDS.md; not protocol stages, no sealed record, final door only — they run
// after FROZEN_SELECTION.json exists):
//   npm run study6 -- nbhd <B5|POOL_ID> [--window W29|W13] [--rep 1|2|3]
//       the joint N1 confirmation set C<rep> (128 points, all books of the pool) and per-book N1 (C1 labels), as the
//       final stage computes them, printed with the centre;
//   npm run study6 -- trace <B5|POOL_ID> [--window W29|W13]
//       the worst minute-drawdown episode with its exact lot decomposition.
// POOL_ID is a research pool of this study (config/research-pools/study6-b5-kre-robustness/<ID>.json).
import { d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { bookOrder, partB } from './context.ts';
import { openDoor } from './data.ts';
import { type Books, design, uniqueMask } from './designs.ts';
import { Lab, ceiling, lotContributions, minuteSeries, newYork } from './evaluate.ts';
import { loadResearchPool } from './poolrun.ts';
import { frozenB5 } from './sets.ts';

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

const booksOf = async (id: string): Promise<Books> => {
  if (id === 'B5') {
    return frozenB5();
  }

  const pool = await loadResearchPool(id);

  return Object.fromEntries(pool.config.books.map((book) => [book.symbol, { ...book.grid }])) as Books;
};

const labOf = async (args: string[], purpose: string) => {
  const window = option(args, 'window') ?? 'W29';

  if (window !== 'W29' && window !== 'W13') {
    throw new Error('--window must be W29 or W13');
  }

  return new Lab(await openDoor('final', [...bookOrder], purpose, window));
};

const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;

export const runNbhd = async (args: string[]) => {
  const id = args[0];

  if (!id) {
    throw new Error('usage: npm run study6 -- nbhd <B5|POOL_ID> [--window W29|W13] [--rep 1|2|3]');
  }

  const rep = Number(option(args, 'rep') ?? '1');
  const books = await booksOf(id);
  const lab = await labOf(args, `inspect nbhd ${id}`);
  const symbols = bookOrder.filter((symbol) => symbol in books);
  const centre = lab.point(books);
  const stats = (perturb: string[], n: number, labels: (string | number)[]) => {
    const points = design({ centre: books, perturb, n, labels, mode: 'clip', scale: 1 });
    const unique = uniqueMask(points, books);
    const dd = points.filter((_p, i) => unique[i]).map((point) => lab.point(point.books).dd);

    return {
      unique: dd.length,
      share: dd.filter((value) => value < ceiling).length / dd.length,
      p90: quantile(dd, 0.9)
    };
  };
  const joint = stats([...symbols], partB.confirmation.n, ['B', 'confirm', rep]);

  console.log(
    `${id}: ${symbols.map((symbol) => `${symbol} ${d1Keys.map((key) => books[symbol]![key]).join('/')}`).join('  ')}`
  );
  console.log(
    `window ${lab.door.dates[lab.door.lastIndex]}: centre net ${money(centre.net)}, minute DD ${money(centre.dd)} (${(centre.dd / 1000).toFixed(2)}% of $100,000)`
  );
  console.log(
    `joint N1 C${rep} (${joint.unique} unique): share < $35,000 ${(joint.share * 100).toFixed(1)}%, p90 ${money(joint.p90)} → gate ${centre.dd < ceiling && joint.share >= 0.9 && joint.p90 < ceiling ? 'PASS' : 'FAIL'}`
  );

  for (const symbol of symbols) {
    const book = stats([symbol], partB.confirmation.bookN, ['B', 'confirm-book', symbol, 1]);

    console.log(`  per-book ${symbol}: share ${(book.share * 100).toFixed(1)}%, p90 ${money(book.p90)}`);
  }
};

export const runTrace = async (args: string[]) => {
  const id = args[0];

  if (!id) {
    throw new Error('usage: npm run study6 -- trace <B5|POOL_ID> [--window W29|W13]');
  }

  const books = await booksOf(id);
  const lab = await labOf(args, `inspect trace ${id}`);
  const run = lab.replay(books, undefined, true);
  const series = minuteSeries(lab, run, books);
  const peak = series.points[series.peakIndex]!;
  const trough = series.points[series.troughIndex]!;
  const parts = lotContributions(series, series.peakIndex, series.troughIndex);

  console.log(
    `${id}: net ${money(run.net)}; worst minute drawdown ${money(series.maximum)} (tracker ${money(series.trackerMaximum)}, ${series.matchesTracker ? 'equal' : 'DIFFERENT'})`
  );
  console.log(
    `peak ${newYork(peak.time)} ET: mark ${money(peak.value)} (realized ${money(peak.realized)}, unrealized ${money(peak.unrealized)})`
  );
  console.log(
    `trough ${newYork(trough.time)} ET: mark ${money(trough.value)} (realized ${money(trough.realized)}, unrealized ${money(trough.unrealized)})`
  );

  for (const row of parts.rows) {
    console.log(
      `  ${row.symbol} ${newYork(row.entryTime)} → ${newYork(row.exitTime)} (${row.exitReason}): ${money(row.contribution)}`
    );
  }

  console.log(`sum ${money(parts.change)} (residual ${parts.residual.toExponential(2)})`);
};

// npm run study6 -- verify-records: every sealed record of the study re-verified (body hash), the diagnostic manifest's
// record and table hashes re-computed, and the protocol hash compared with its freeze. Read-only.
export const runVerifyRecords = async () => {
  const { default: fs } = await import('fs-extra');
  const path = await import('node:path');
  const { diagnosticManifestFile, protocolFreezeFile, resultsDir, studyDir } = await import('./context.ts');
  const { sha256, verifySealed } = await import('./data.ts');
  const files = (await fs.readdir(resultsDir, { recursive: true }))
    .map(String)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(resultsDir, name));
  let sealed = 0;
  const failures: string[] = [];

  for (const file of [...files, path.join(studyDir, 'FROZEN_SELECTION.json')]) {
    const record = (await fs.readJson(file)) as Record<string, unknown>;

    if (typeof record.bodyHash === 'string') {
      sealed++;

      if (!verifySealed(record)) {
        failures.push(`${file}: body hash`);
      }
    }
  }

  const manifest = (await fs.readJson(diagnosticManifestFile)) as {
    records: Record<string, { fileSha256: string }>;
    tables: Record<string, string>;
    protocol: { sha256: string };
  };

  for (const [name, entry] of Object.entries(manifest.records)) {
    if (sha256(await fs.readFile(path.join(resultsDir, name))) !== entry.fileSha256) {
      failures.push(`${name}: file hash differs from the diagnostic manifest`);
    }
  }

  for (const [name, hash] of Object.entries(manifest.tables)) {
    if (sha256(await fs.readFile(path.join(resultsDir, name))) !== hash) {
      failures.push(`${name}: table hash differs from the diagnostic manifest`);
    }
  }

  const freeze = (await fs.readJson(protocolFreezeFile)) as { protocol: { sha256: string } };
  const protocolNow = sha256(await fs.readFile(path.join(studyDir, 'PROTOCOL.md')));

  console.log(`sealed records: ${sealed} verified, ${failures.length} failures`);
  console.log(
    `diagnostic manifest: ${Object.keys(manifest.records).length} records, ${Object.keys(manifest.tables).length} tables re-hashed`
  );
  console.log(
    `PROTOCOL.md sha256 ${protocolNow.slice(0, 16)}… (frozen ${freeze.protocol.sha256.slice(0, 16)}…; ${protocolNow === freeze.protocol.sha256 ? 'unchanged' : 'amended after the freeze — see §13'})`
  );

  for (const failure of failures) {
    console.log(`FAIL ${failure}`);
  }

  if (failures.length) {
    process.exitCode = 1;
  }
};
