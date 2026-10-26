// `npm run pools -- forward freeze`: writes research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json once, before any
// post-cutoff bar exists; and the verification every forward command runs first. The freeze records B4's and B5's
// state at the cutoff on the frozen `all` (inspected history) so that a forward run can prove it carried that exact
// state across the boundary.
import fs from 'fs-extra';
import { loadPool } from '../load.ts';
import { anchorChecks, dataRecordOf } from '../report.ts';
import { type PoolRunOptions, figuresOf, loadPoolUniverse, runPoolOn } from '../run.ts';
import { stateAt } from './metrics.ts';
import {
  calendarAppendOnlyFailures,
  type CalendarState,
  calendarState,
  codeManifest,
  freezeFileOf,
  prospective,
  protocolFileOf,
  readSealed,
  sha256File,
  writeOnce
} from './protocol.ts';

export const marketEventFiles = [
  'config/market-events/distributions.manifest.json',
  'config/market-events/splits.json',
  'config/market-events/distributions.csv',
  'data/partitions.json'
];

export const cutoffModes = [
  { key: 'fixed', mode: 'fixed', dividends: 'frozen' },
  { key: 'portfolio-frozen', mode: 'portfolio', dividends: 'frozen' },
  { key: 'portfolio-symmetric', mode: 'portfolio', dividends: 'symmetric' }
] as const;

// The npm script the commands run under (its flags, e.g. the absence of --env-file, are part of the setup).
export const poolsScript = async () =>
  String(((await fs.readJson('package.json')) as { scripts: Record<string, string> }).scripts.pools ?? '');

// The module aliases (#lib, #types) resolve the bound code; a changed map would run different code.
export const importsMap = async () =>
  JSON.stringify(((await fs.readJson('package.json')) as { imports?: Record<string, string> }).imports ?? {});

export interface ProspectiveFreeze {
  bodyHash: string;
  version: string;
  frozenAt: string;
  cutoff: string;
  protocol: { file: string; sha256: string };
  pools: Record<
    string,
    {
      file: string;
      fileSha256: string;
      configHash: string;
      books: Record<string, { phenotype: string; parametersSha256: string }>;
    }
  >;
  challengers: never[];
  challengerNote: string;
  conventions: Record<string, unknown>;
  code: { entries: string[]; files: Record<string, string>; digest: string };
  calendar: CalendarState;
  environment: { node: string; poolsScript: string; importsMap: string; packageLockSha256: string };
  data: { canonicalPins: Record<string, string>; end: string; marketEvents: Record<string, string> };
  cutoffState: Record<string, Record<string, ReturnType<typeof stateAt>>>;
  historicalBaseline: Record<string, Record<string, Record<string, number | string>>>;
}

export const writeProspectiveFreeze = async (dir = prospective.dir) => {
  const file = freezeFileOf(dir);

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the prospective protocol is frozen once`);
  }

  const pools: ProspectiveFreeze['pools'] = {};
  const cutoffState: ProspectiveFreeze['cutoffState'] = {};
  const historicalBaseline: ProspectiveFreeze['historicalBaseline'] = {};
  let canonicalPins: Record<string, string> = {};

  for (const id of prospective.pools) {
    const pool = await loadPool(id);

    pools[id] = {
      file: pool.config.file,
      fileSha256: await sha256File(pool.config.file),
      configHash: pool.config.configHash,
      books: Object.fromEntries(
        pool.config.books.map((book) => [
          book.symbol,
          { phenotype: book.phenotype, parametersSha256: book.parametersSha256 }
        ])
      )
    };
    canonicalPins = {
      ...canonicalPins,
      ...((pool.config.regressionAnchors?.dataSha256 ?? {}) as Record<string, string>)
    };
    cutoffState[id] = {};
    historicalBaseline[id] = {};

    for (const item of cutoffModes) {
      const options: PoolRunOptions = {
        mode: item.mode,
        dataset: 'all',
        costBps: prospective.principalCostBps,
        dividends: item.dividends
      };
      const loaded = await loadPoolUniverse(pool, options);
      const data = dataRecordOf(pool, loaded);

      if (!data.frozenAll || loaded.universe.end !== prospective.cutoff) {
        throw new Error(
          `${id} ${item.key}: ${data.frozenAllNote}; the freeze needs the frozen all ending ${prospective.cutoff}`
        );
      }

      const result = runPoolOn(pool, loaded, options);
      const computed = figuresOf(pool, loaded, result, options);
      const anchors = anchorChecks(pool, options, computed, data.frozenAll);

      if (anchors.checks.some((check) => !check.pass)) {
        throw new Error(`${id} ${item.key}: the regression anchors fail; nothing is frozen`);
      }

      cutoffState[id]![item.key] = stateAt(result, result.endIndex);
      historicalBaseline[id]![item.key] = {
        label: 'inspected history 2016-01-04 → 2026-10-13 (not forward evidence)',
        net: computed.summary.net,
        minuteDrawdown: computed.summary.minuteDrawdown,
        dailyDrawdown: computed.summary.dailyDrawdown,
        lots: computed.summary.lots,
        ...(item.mode === 'portfolio'
          ? { endEquity: computed.summary.endEquity, dailyPercent: computed.summary.dailyPercent }
          : {})
      };
    }
  }

  return writeOnce(file, {
    version: prospective.version,
    frozenAt: new Date().toISOString(),
    cutoff: prospective.cutoff,
    firstForwardSession: prospective.firstForwardSession,
    protocol: { file: protocolFileOf(dir), sha256: await sha256File(protocolFileOf(dir)) },
    pools,
    challengers: [],
    challengerNote:
      'none in this version: the diverse-d1 finalists stay research-only (config/research-pools/diverse-d1-2026-10-26/); see PROTOCOL.md §7',
    conventions: {
      fixed: {
        fundedSlots: 1,
        notionalPerTrade: 100000,
        compounding: false,
        policy: 'shadow',
        sameMinuteOrder: 'alphabetical'
      },
      annualRate: prospective.annualRate,
      interest: 'simple, 365-day year, accrued daily',
      costBpsPerSide: prospective.principalCostBps,
      commission: 0,
      portfolio: {
        initialCore: { VOOG: 180000, VGT: 120000 },
        borrowedFraction: 0.2,
        principalDividends: 'frozen',
        reportedDividends: 'symmetric'
      },
      reportingOnly: {
        frictionBps: prospective.frictionScenariosBps,
        rates: prospective.rateScenarios,
        ladderFractions: prospective.ladderFractions
      },
      evidenceThreshold: prospective.evidenceThreshold,
      boundary:
        'one continuous run from 2016-01-04; baselines at the cutoff close; nothing reset; carried lots from their mark at the cutoff',
      splitMoveLimit: prospective.splitMoveLimit
    },
    code: await codeManifest(),
    calendar: calendarState(),
    environment: {
      node: process.version,
      poolsScript: await poolsScript(),
      importsMap: await importsMap(),
      packageLockSha256: await sha256File('package-lock.json')
    },
    data: {
      canonicalPins,
      end: prospective.cutoff,
      marketEvents: Object.fromEntries(
        await Promise.all(marketEventFiles.map(async (item) => [item, await sha256File(item)] as const))
      )
    },
    cutoffState,
    historicalBaseline
  });
};

// Everything the freeze binds must still hold; any difference refuses the forward command.
export const verifyProspectiveFreeze = async (dir = prospective.dir) => {
  const file = freezeFileOf(dir);

  if (!(await fs.pathExists(file))) {
    return { frozen: false as const, failures: [`${file} does not exist (npm run pools -- forward freeze)`] };
  }

  const freeze = await readSealed<ProspectiveFreeze>(file);
  const failures: string[] = [];

  if ((await sha256File(freeze.protocol.file)) !== freeze.protocol.sha256) {
    failures.push(`${freeze.protocol.file} changed after the freeze`);
  }

  for (const [id, bound] of Object.entries(freeze.pools)) {
    try {
      const pool = await loadPool(id);

      if ((await sha256File(pool.config.file)) !== bound.fileSha256) {
        failures.push(`${id}: ${pool.config.file} changed after the freeze`);
      }

      if (pool.config.configHash !== bound.configHash) {
        failures.push(
          `${id}: the pool's algorithmic hash changed (${bound.configHash.slice(0, 12)} → ${pool.config.configHash.slice(0, 12)})`
        );
      }

      for (const book of pool.config.books) {
        if (bound.books[book.symbol]?.parametersSha256 !== book.parametersSha256) {
          failures.push(`${id} ${book.symbol}: the member vector changed`);
        }
      }

      if (Object.keys(bound.books).length !== pool.config.books.length) {
        failures.push(`${id}: the members changed`);
      }
    } catch (error) {
      failures.push(`${id}: ${(error as Error).message}`);
    }
  }

  const code = await codeManifest(freeze.code.entries);

  if (code.digest !== freeze.code.digest) {
    const changed = [...new Set([...Object.keys(code.files), ...Object.keys(freeze.code.files)])].filter(
      (item) => code.files[item] !== freeze.code.files[item]
    );

    failures.push(`the code changed after the freeze: ${changed.join(', ')}`);
  }

  if (freeze.environment) {
    if ((await poolsScript()) !== freeze.environment.poolsScript) {
      failures.push('the `pools` npm script in package.json changed after the freeze');
    }

    if ((await importsMap()) !== freeze.environment.importsMap) {
      failures.push('the package.json "imports" map changed after the freeze');
    }

    if ((await sha256File('package-lock.json')) !== freeze.environment.packageLockSha256) {
      failures.push('package-lock.json (the dependency versions) changed after the freeze');
    }
  }

  if (freeze.calendar) {
    failures.push(...calendarAppendOnlyFailures(freeze.calendar, calendarState()));
  } else {
    failures.push('the freeze records no calendar state');
  }

  for (const [item, hash] of Object.entries(freeze.data.marketEvents)) {
    if ((await sha256File(item)) !== hash) {
      failures.push(`${item} changed after the freeze`);
    }
  }

  for (const [symbol, hash] of Object.entries(freeze.data.canonicalPins)) {
    const item = `data/${symbol}/data.csv`;

    if (!(await fs.pathExists(item)) || (await sha256File(item)) !== hash) {
      failures.push(
        `${item} is not the frozen canonical file (do not extend data/ for this protocol; import a snapshot)`
      );
    }
  }

  return { frozen: true as const, freeze, failures };
};
