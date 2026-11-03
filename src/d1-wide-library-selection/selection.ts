// The libraries stage (PROTOCOL.md §6–§7, §8.2 step 1): for one fold, every pool's libraries and training-only
// selections for every ETF, arm and K, written once to results/libraries/<fold>/SELECTION.json (sealed) with the full
// member records in members-<pool>.json.gz and a readable libraries.csv.gz. Training data only (the fold's training
// door); every draw of every pool is evaluated once (shared across pools by grid). The fold's evaluation door opens
// only after this record is sealed.
import { gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import {
  type FoldKey,
  type LibraryArm,
  type PoolKey,
  folds,
  libraryArms,
  libraryKs,
  log,
  nowIso,
  resultFile,
  rules,
  vgtPrimary
} from './context.ts';
import {
  archiveCandidatesFile,
  libraryGridsOf,
  readArchiveCandidates,
  readProfile,
  reconstructionFile
} from './archive.ts';
import { type Candidate } from './candidates.ts';
import { censusFile } from './census.ts';
import { selectionFile, trainingUniverse } from './doors.ts';
import { Fast, gridKeyOf } from './fast.ts';
import { readStageRecord, requireCodeFrozen } from './freeze.ts';
import { sampleParityFile } from './sample.ts';
import { type Nominee, type SymbolSelection, drawPlan, evaluateDraws, prepareSymbol, selectSymbol } from './library.ts';
import { readSealed, sha256File, sha256Json, writeRecord } from './records.ts';
import { readSearchCandidates, searchFile } from './search.ts';

export const membersFile = (fold: FoldKey, pool: PoolKey) => resultFile('libraries', fold, `members-${pool}.json.gz`);
export const librariesCsvFile = (fold: FoldKey) => resultFile('libraries', fold, 'libraries.csv.gz');

export type ArmKeyAll = 'A0' | 'A0r' | LibraryArm;

export interface CompactSelection extends Omit<SymbolSelection, 'members'> {
  a0?: {
    status: string;
    representative: string | null;
    library: string[];
    nominee: string | null;
    score: number; // the sealed representative's own J_nb (its stored 16-draw neighbourhood median)
    equalsA0r: boolean;
  };
}

export interface AcrossEntry {
  symbol: string;
  key: string;
  score: number;
}

// The across-ETF layer: the arm's nominees ordered by score (desc, then symbol); the first acrossN advance.
export const acrossOf = (entries: readonly AcrossEntry[]) =>
  [...entries].sort((a, b) => b.score - a.score || (a.symbol < b.symbol ? -1 : 1)).slice(0, rules.acrossN);

export const poolsOf = async (fold: FoldKey) => {
  const spec = folds[fold];
  const out: Partial<Record<PoolKey, Candidate[]>> = {};
  let archive: Candidate[] = [];
  let fresh: Candidate[] = [];

  if (spec.pools.includes('ARCH')) {
    archive = await readArchiveCandidates(spec.sourceWindow as 'fold-a' | 'fold-b');
  }

  if (spec.pools.some((pool) => pool !== 'ARCH')) {
    fresh = await readSearchCandidates(fold);
  }

  // ARCH-S: the archived Sobol rows with origin index 0..1023 (the budget-matched comparator of NEW-S)
  const archiveSobol = archive.filter(
    (candidate) => candidate.stage === 'sobol' && Number(candidate.origin.split(':').at(-1)) < rules.archSobolRows
  );

  for (const pool of spec.pools) {
    out[pool] =
      pool === 'ARCH'
        ? archive
        : pool === 'ARCH-S'
          ? archiveSobol
          : pool === 'NEW'
            ? fresh
            : pool === 'NEW-S'
              ? fresh.filter((candidate) => candidate.stage === 'new-sobol')
              : [...archive, ...fresh];
  }

  return out as Record<PoolKey, Candidate[]>;
};

const csvCell = (value: unknown) => {
  if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
    return '';
  }

  const text = typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const runLibraries = async (fold: FoldKey, options: { workers?: number } = {}) => {
  const guard = await requireCodeFrozen();
  const target = selectionFile(fold);

  if (await fs.pathExists(target)) {
    throw new Error(`${target} exists: fold ${fold}'s libraries are sealed and never rebuilt`);
  }

  const spec = folds[fold];
  const startedAt = nowIso();
  const { loaded, door } = await trainingUniverse(fold);
  const inputs: Record<string, unknown> = {};

  if (spec.pools.includes('ARCH')) {
    const window = spec.sourceWindow as 'fold-a' | 'fold-b';
    const reconstruction = await readStageRecord<{ bodyHash: string; door: { digest: string } }>(
      reconstructionFile(window)
    );
    const census = await readStageRecord<{ bodyHash: string }>(censusFile(window));

    if (reconstruction.door.digest !== door.digest) {
      throw new Error(`fold ${fold}: the training door differs from the reconstruction's`);
    }

    inputs.reconstruction = { file: reconstructionFile(window), bodyHash: reconstruction.bodyHash };
    inputs.archiveCandidates = {
      file: archiveCandidatesFile(window),
      sha256: await sha256File(archiveCandidatesFile(window))
    };
    inputs.census = { file: censusFile(window), bodyHash: census.bodyHash };
  }

  const parity = await readStageRecord<{ bodyHash: string; failed: number }>(sampleParityFile(fold));

  if (parity.failed !== 0) {
    throw new Error(`fold ${fold}: its engine-versus-fast parity sample failed`);
  }

  inputs.sampleParity = { file: sampleParityFile(fold), bodyHash: parity.bodyHash };

  if (spec.pools.some((pool) => pool !== 'ARCH' && pool !== 'ARCH-S')) {
    const search = await readStageRecord<{ bodyHash: string; door: { digest: string } }>(searchFile(fold));

    if (search.door.digest !== door.digest) {
      throw new Error(`fold ${fold}: the training door differs from the search's`);
    }

    inputs.search = { file: searchFile(fold), bodyHash: search.bodyHash };
  }

  const pools = await poolsOf(fold);
  const fast = await Fast.create(loaded, options.workers);
  const symbols = Object.keys(loaded.universe.instruments).sort();

  log(`libraries ${fold}: pools ${spec.pools.join(', ')}; ${symbols.length} symbols`);

  const prepared = spec.pools.flatMap((pool) =>
    symbols.map((symbol) => ({ pool, symbol, prepared: prepareSymbol(loaded, symbol, pools[pool]) }))
  );
  const plans = prepared.map((entry) => ({ ...entry, plan: drawPlan(fast, spec, entry.prepared) }));
  const { results, evaluated } = await evaluateDraws(
    fast,
    plans.map((entry) => ({ symbol: entry.symbol, plan: entry.plan }))
  );

  await fast.close();
  log(`libraries ${fold}: ${evaluated} distinct draws evaluated`);

  const selections: Record<string, Record<string, CompactSelection>> = {};
  const memberFiles: Record<string, { file: string; sha256: string }> = {};
  const csv: string[] = [
    [
      'pool',
      'symbol',
      'arm',
      'rank',
      'key',
      'provenance',
      'stage',
      'family',
      'familySize',
      'familySupport',
      'trades',
      'net',
      'best',
      'worst',
      'dd',
      'js',
      't',
      'netPerDay',
      'entryYears',
      'catalogFamilies',
      'jnb',
      'tnb',
      'a3Profitable',
      'a3DdShare',
      'a3P25',
      ...libraryKs.map((k) => `nominee${k}`)
    ].join(',')
  ];

  for (const pool of spec.pools) {
    const members: Record<string, SymbolSelection['members']> = {};

    selections[pool] = {};

    for (const entry of plans.filter((item) => item.pool === pool)) {
      const selection = selectSymbol(entry.prepared, pool, entry.plan, results);
      const { members: memberRecords, ...compact } = selection;

      members[entry.symbol] = memberRecords;
      selections[pool]![entry.symbol] = compact;

      const rows: [string, string[]][] = [
        ['A0r', selection.a0r.library],
        ...libraryArms.map((arm): [string, string[]] => [arm, selection.arms[arm].library])
      ];

      for (const [arm, keys] of rows) {
        keys.forEach((key, rank) => {
          const m = memberRecords[key]!;
          const nominated = libraryKs.map((k) =>
            arm === 'A0r'
              ? selection.a0r.nominee?.key === key
                ? 1
                : 0
              : selection.arms[arm as LibraryArm].nominees[String(k)]?.key === key
                ? 1
                : 0
          );

          csv.push(
            [
              pool,
              entry.symbol,
              arm,
              rank + 1,
              key,
              m.provenance,
              m.stage,
              m.family,
              m.familySize,
              m.familySupport,
              m.trades,
              m.net,
              m.best,
              m.worst,
              m.dd,
              m.js,
              m.t,
              m.netPerDay,
              m.entryYears,
              m.catalogFamilies,
              m.jnb,
              m.tnb,
              m.a3?.profitableShare,
              m.a3?.ddShare,
              m.a3?.p25,
              ...nominated
            ]
              .map(csvCell)
              .join(',')
          );
        });
      }
    }

    const file = membersFile(fold, pool);

    await fs.outputFile(file, gzipSync(JSON.stringify(members), { level: 9 }));
    memberFiles[pool] = { file, sha256: await sha256File(file) };
  }

  // A0: the sealed source records (folds with an archive), checked against A0r on ARCH
  if (spec.pools.includes('ARCH')) {
    const window = spec.sourceWindow as 'fold-a' | 'fold-b';

    for (const symbol of symbols) {
      const profile = await readProfile(window, symbol);
      const library = (await libraryGridsOf(profile)).filter((item) => item.role !== 'ranking-representative');
      const representative = profile.representative ? gridKeyOf(profile.representative.grid as never) : null;
      const nominee = profile.status === 'survivor' ? representative : null;
      const a0r = selections.ARCH![symbol]!.a0r;

      selections.ARCH![symbol]!.a0 = {
        status: profile.status,
        representative,
        library: library.map((item) => item.key),
        nominee,
        score: profile.representative?.neighbourhood?.median ?? NaN,
        equalsA0r:
          a0r.representative === representative &&
          JSON.stringify(a0r.library) === JSON.stringify(library.map((item) => item.key)) &&
          (a0r.nominee?.key ?? null) === nominee
      };
    }
  }

  // across-ETF
  const across: Record<string, Record<string, Record<string, AcrossEntry[]>>> = {};

  for (const pool of spec.pools) {
    across[pool] = { A0r: { all: [] } };

    const entries = (pick: (s: CompactSelection) => Nominee | null) =>
      symbols.flatMap((symbol) => {
        const nominee = pick(selections[pool]![symbol]!);

        return nominee ? [{ symbol, key: nominee.key, score: nominee.score }] : [];
      });

    across[pool]!.A0r = { all: acrossOf(entries((s) => s.a0r.nominee)) };

    for (const arm of libraryArms) {
      across[pool]![arm] = Object.fromEntries(
        libraryKs.map((k) => [String(k), acrossOf(entries((s) => s.arms[arm].nominees[String(k)] ?? null))])
      );
    }
  }

  // the power of every comparison, known before any evaluation (PROTOCOL.md §9.2): per pool, arm and K, the ETFs whose
  // nominee equals the baseline's (both none included) and the ETFs where only one of the two nominates
  const baselineOf = (pool: PoolKey, symbol: string) => {
    const s = selections[pool]![symbol]!;

    return pool === 'ARCH' && s.a0 ? s.a0.nominee : (s.a0r.nominee?.key ?? null);
  };
  const power: Record<
    string,
    Record<
      string,
      Record<string, { identical: number; differing: number; onlyArm: number; onlyBase: number; both: number }>
    >
  > = {};

  for (const pool of spec.pools) {
    power[pool] = {};

    for (const arm of libraryArms) {
      power[pool]![arm] = {};

      for (const k of libraryKs) {
        let identical = 0;
        let onlyArm = 0;
        let onlyBase = 0;
        let both = 0;

        for (const symbol of symbols) {
          const a = selections[pool]![symbol]!.arms[arm].nominees[String(k)]?.key ?? null;
          const b = baselineOf(pool, symbol);

          if (a === b) {
            identical++;
          } else if (a && b) {
            both++;
          } else if (a) {
            onlyArm++;
          } else {
            onlyBase++;
          }
        }

        power[pool]![arm]![String(k)] = { identical, differing: symbols.length - identical, onlyArm, onlyBase, both };
      }
    }
  }

  // flags (training only): a new nominee whose training trade signature equals an archived vector's of the same fold,
  // or whose grid equals an incumbent's (VGT primary, a B4/B5 book of the same symbol)
  const archivedSignatures = new Set(
    (spec.pools.includes('ARCH') ? pools.ARCH : []).map((c) => `${c.symbol}|${c.signature}`)
  );
  const { loadPoolBooks } = await import('../d1-standalone-opportunity-audit/parity.ts');
  const incumbents = await loadPoolBooks();
  const incumbentKeys = new Set([
    `VGT|${gridKeyOf(vgtPrimary.grid as never)}`,
    ...[...incumbents.B4, ...incumbents.B5].map((book) => `${book.symbol}|${gridKeyOf(book.grid as never)}`)
  ]);
  const flags: { pool: string; symbol: string; key: string; reason: string }[] = [];

  for (const pool of spec.pools.filter((p) => p !== 'ARCH' && p !== 'ARCH-S')) {
    const signatureOf = new Map(pools[pool].map((c) => [`${c.symbol}|${c.key}`, c.signature]));

    for (const symbol of symbols) {
      const s = selections[pool]![symbol]!;
      const keys = new Set(
        [
          s.a0r.nominee?.key,
          ...libraryArms.flatMap((arm) => libraryKs.map((k) => s.arms[arm].nominees[String(k)]?.key))
        ].filter(Boolean) as string[]
      );

      for (const key of keys) {
        if (archivedSignatures.has(`${symbol}|${signatureOf.get(`${symbol}|${key}`)}`)) {
          flags.push({ pool, symbol, key, reason: 'training trade signature equals an archived vector of this fold' });
        }

        if (incumbentKeys.has(`${symbol}|${key}`)) {
          flags.push({ pool, symbol, key, reason: 'grid equals an incumbent phenotype' });
        }
      }
    }
  }

  const csvFile = librariesCsvFile(fold);

  await fs.outputFile(csvFile, gzipSync(`${csv.join('\n')}\n`, { level: 9 }));

  const nomineeMap = Object.fromEntries(
    spec.pools.map((pool) => [
      pool,
      Object.fromEntries(
        symbols.map((symbol) => {
          const s = selections[pool]![symbol]!;

          return [
            symbol,
            {
              A0r: s.a0r.nominee?.key ?? null,
              ...Object.fromEntries(
                libraryArms.flatMap((arm) =>
                  libraryKs.map((k) => [`${arm}:${k}`, s.arms[arm].nominees[String(k)]?.key ?? null])
                )
              )
            }
          ];
        })
      )
    ])
  );

  return writeRecord(target, {
    stage: 'libraries',
    fold,
    startedAt,
    finishedAt: nowIso(),
    guard,
    door,
    inputs,
    drawEvaluations: evaluated,
    libraryKs,
    selections,
    across,
    power,
    flags,
    nomineeDigest: sha256Json(nomineeMap),
    librariesDigest: sha256Json(
      Object.fromEntries(
        spec.pools.map((pool) => [
          pool,
          Object.fromEntries(
            symbols.map((symbol) => {
              const s = selections[pool]![symbol]!;

              return [
                symbol,
                {
                  A0r: s.a0r.library,
                  A1: s.arms.A1.library,
                  A1n: s.arms.A1n.library,
                  A2: s.arms.A2.library,
                  A3: s.arms.A3.library
                }
              ];
            })
          )
        ])
      )
    ),
    members: memberFiles,
    csv: { file: csvFile, sha256: await sha256File(csvFile) }
  });
};

export const readSelection = async (fold: FoldKey) =>
  readStageRecord<{
    bodyHash: string;
    fold: FoldKey;
    selections: Record<string, Record<string, CompactSelection>>;
    across: Record<string, Record<string, Record<string, AcrossEntry[]>>>;
    members: Record<string, { file: string; sha256: string }>;
    door: { digest: string; lastDate: string };
  }>(selectionFile(fold));

export const readMembers = async (
  fold: FoldKey,
  pool: PoolKey
): Promise<Record<string, SymbolSelection['members']>> => {
  const selection = await readSelection(fold);
  const entry = selection.members[pool]!;

  if ((await sha256File(entry.file)) !== entry.sha256) {
    throw new Error(`${entry.file}: does not hash to its sealed libraries record`);
  }

  const { gunzipSync } = await import('node:zlib');

  return JSON.parse(gunzipSync(await fs.readFile(entry.file)).toString('utf8'));
};
