// The seven shipped D1 phenotypes reproduce their research, trade by trade, through the phenotype runner and the
// unmodified D1 file: VGT primary against research/vgt-d1-refinement (D1's baseline), the multi-ETF phenotypes
// against the frozen holdout run of research/multi-etf-d1 (one continuous run from 2017-06-15 to the end of the
// file, with development and holdout as segments). The development/holdout boundary carries every state: the
// development segment equals a run truncated at 2023-12-29, and KRE's first 2024 trade is a continuation entry
// armed by a 2023 exit, which a run restarted on 2024-01-02 cannot make. Skipped where the data is absent.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { promisify } from 'node:util';
import fs from 'fs-extra';
import { parse } from 'csv-parse/sync';
import { formatNewYorkTime } from '#lib';
import { type PhenotypeRun, type PhenotypeRunRequest, executePhenotypeRun, planPhenotypeRun } from '../run.ts';

const script = 'allIn-trailingBuy-postExitContinuation';
const tolerance = 1e-6;
const near = (actual: number, expected: number, label: string) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${label}: ${actual} vs ${expected}`
  );

interface ReferenceTrade {
  kind: string;
  entryDate: string;
  entryTime: string; // New York minute
  entryPrice: number;
  exitDate: string;
  exitTime: string;
  exitPrice: number; // the last close for an open trade
  reason: string;
  interest: number;
  profit: number;
}

interface ReferenceSegment {
  net: number;
  minuteDrawdown: number;
  dailyDrawdown?: number;
  interest: number;
  entries: number;
  exits: number;
  wins: number;
  losses?: number;
}

interface Reference {
  net: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  trades: ReferenceTrade[];
  segments: Record<'full' | 'development' | 'holdout', ReferenceSegment>;
}

const vgtReference = async (): Promise<Reference> => {
  const [d1] = await fs.readJson('research/vgt-d1-refinement/results/baseline/baseline.json');
  const segment = (label: string) =>
    d1.metrics.segments.find((candidate: { label: string }) => candidate.label === label);

  assert.equal(d1.label, 'D1');

  return {
    net: d1.metrics.net,
    minuteDrawdown: d1.metrics.minuteDrawdown,
    dailyDrawdown: d1.metrics.dailyDrawdown,
    trades: d1.trades.map((trade: Record<string, unknown>) => ({ ...trade, exitDate: trade.exitDate ?? '' })),
    // The VGT program called 2024-01-02 → 2025-10-13 'reused': it had been inspected, it is not a sealed holdout.
    segments: { full: segment('full'), development: segment('development'), holdout: segment('reused') }
  };
};

const multiEtfReference = async (symbol: string, role: string): Promise<Reference> => {
  const directory = `research/multi-etf-d1/results/holdout/${symbol}/${role}`;
  const summary = await fs.readJson(`${directory}/summary.json`);
  const rows: Record<string, string>[] = parse(await fs.readFile(`${directory}/trades.csv`), { columns: true });
  const segment = (label: string) => {
    const found = summary.segments.find((candidate: { label: string }) => candidate.label === label);

    return { ...found, minuteDrawdown: found.minuteDrawdown, dailyDrawdown: found.dailyDrawdown };
  };

  assert.equal(summary.run.armStartDate, '2017-06-15');
  assert.equal(summary.run.marginInterestRate, 0.11);
  assert.equal(summary.run.investmentPerEntry, 100000);
  assert.equal(summary.run.stopFill, 'stop');

  return {
    net: summary.metrics.net,
    minuteDrawdown: summary.metrics.minuteDrawdown,
    dailyDrawdown: summary.metrics.dailyDrawdown,
    trades: rows.map((row) => ({
      kind: row.kind!,
      entryDate: row.entry_date!,
      entryTime: row.entry_time_ny!,
      entryPrice: Number(row.entry_price_observed),
      exitDate: row.exit_date!,
      exitTime: row.exit_time_ny!,
      exitPrice: Number(row.exit_price_observed),
      reason: row.reason!,
      interest: Number(row.interest),
      profit: Number(row.net_profit)
    })),
    segments: { full: segment('combined'), development: segment('development'), holdout: segment('holdout') }
  };
};

const configurations = [
  { symbol: 'VGT', phenotype: 'primary', reference: vgtReference },
  { symbol: 'XBI', phenotype: 'primary', reference: () => multiEtfReference('XBI', 'primary') },
  { symbol: 'XBI', phenotype: 'lowDd', reference: () => multiEtfReference('XBI', 'alternate-lowDd') },
  { symbol: 'XRT', phenotype: 'primary', reference: () => multiEtfReference('XRT', 'primary') },
  { symbol: 'XRT', phenotype: 'lowDd', reference: () => multiEtfReference('XRT', 'alternate-lowDd') },
  { symbol: 'KRE', phenotype: 'primary', reference: () => multiEtfReference('KRE', 'primary') },
  { symbol: 'KRE', phenotype: 'lowDd', reference: () => multiEtfReference('KRE', 'alternate-lowDd') }
];

// The research's own files (the execution profile's dataHashes), not the dataset partitions: a reproduction is
// only meaningful on the bytes the research read. The legacy files are no longer in data/, so this is skipped
// unless one is restored there.
const dataFileOf = (symbol: string) => `data/${symbol}/${symbol}-2016-2025-1-minute.csv`;
const missing = (symbol: string) =>
  fs.existsSync(dataFileOf(symbol)) ? false : `${dataFileOf(symbol)} is not present`;

const runs = new Map<string, Promise<PhenotypeRun>>();

const runOf = (request: Partial<PhenotypeRunRequest> & { symbol: string; phenotype: string }) => {
  const key = JSON.stringify(request);

  if (!runs.has(key)) {
    runs.set(
      key,
      planPhenotypeRun({ script, ...request }).then((plan) =>
        executePhenotypeRun(plan, { log: () => {}, quietStrategy: true })
      )
    );
  }

  return runs.get(key)!;
};

// The run's trades in the reference's terms.
const tradesOf = ({ result, report }: PhenotypeRun): ReferenceTrade[] => {
  const lastClose = result.sessions.at(-1)!.close;
  const date = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

  return result.positions.map((position, index) => {
    const entry = result.entryFills.get(position) as unknown as { time: number; setupKind: string };
    const exit = result.exitFills.get(position);
    const outcome = report.accounting.outcomes[index]!;

    return {
      kind: entry.setupKind,
      entryDate: date(position.entryTimestamp),
      entryTime: formatNewYorkTime(entry.time),
      entryPrice: position.entryPrice,
      exitDate: position.isOpen ? '' : date(position.exitTimestamp!),
      exitTime: exit ? formatNewYorkTime(exit.time) : '',
      exitPrice: position.isOpen ? lastClose : position.exitPrice!,
      reason: position.isOpen ? 'open' : exit!.reason,
      interest: outcome.interest,
      profit: outcome.profit
    };
  });
};

const compareTrades = (actual: ReferenceTrade[], expected: ReferenceTrade[], label: string) => {
  assert.equal(actual.length, expected.length, `${label}: trade count`);

  actual.forEach((trade, index) => {
    const reference = expected[index]!;
    const where = `${label} trade ${index + 1} (${reference.entryDate})`;

    for (const key of ['kind', 'entryDate', 'entryTime', 'exitDate', 'exitTime', 'reason'] as const) {
      assert.equal(trade[key], reference[key], `${where}: ${key}`);
    }

    for (const key of ['entryPrice', 'exitPrice', 'interest', 'profit'] as const) {
      near(trade[key], reference[key], `${where}: ${key}`);
    }
  });
};

const segmentOf = (run: PhenotypeRun, label: string) => {
  const segment = run.report.periods.find((candidate) => candidate.label === label);

  assert.ok(segment, `no ${label} period`);
  return segment;
};

describe('the shipped phenotypes reproduce their research', () => {
  for (const configuration of configurations) {
    const label = `${configuration.symbol} ${configuration.phenotype}`;

    test(`${label}: every trade, the totals and the periods`, { skip: missing(configuration.symbol) }, async () => {
      const run = await runOf({ symbol: configuration.symbol, phenotype: configuration.phenotype });
      const reference = await configuration.reference();

      assert.equal(run.dataset.hashStatus, 'matches the profile');
      assert.equal(run.dataset.simulated[0]!.date, '2016-01-04');
      assert.equal(run.dataset.simulated.at(-1)!.date, configuration.symbol === 'VGT' ? '2025-10-13' : '2025-10-16');
      assert.equal(run.dataset.simulated[run.dataset.firstEligibleIndex]!.date, '2017-06-15');
      compareTrades(tradesOf(run), reference.trades, label);
      near(run.report.accounting.netProfit, reference.net, `${label}: net`);
      near(run.report.accounting.minuteDrawdown.maximum, reference.minuteDrawdown, `${label}: minute DD`);
      near(run.report.accounting.dailyDrawdown.maximum, reference.dailyDrawdown, `${label}: daily DD`);
      assert.equal(run.report.closedTradeMismatch, 0, `${label}: replay vs strategy profits`);

      for (const period of ['full', 'development', 'holdout'] as const) {
        const actual = segmentOf(run, period);
        const expected = reference.segments[period];
        const where = `${label} ${period}`;

        near(actual.net, expected.net, `${where}: net`);
        near(actual.minuteDrawdown.maximum, expected.minuteDrawdown, `${where}: minute DD`);
        near(actual.interest, expected.interest, `${where}: interest`);
        assert.equal(actual.entries, expected.entries, `${where}: entries`);
        assert.equal(actual.exits, expected.exits, `${where}: exits`);
        assert.equal(actual.wins, expected.wins, `${where}: wins`);

        if (expected.dailyDrawdown !== undefined) {
          near(actual.dailyDrawdown.maximum, expected.dailyDrawdown, `${where}: daily DD`);
        }
      }

      // Every phenotype parameter and both execution constants were read by the strategy.
      for (const name of Object.keys(run.plan.values)) {
        assert.equal(run.verification.reads[name], 1, `${label}: ${name} read once`);
      }
    });
  }

  test(
    'VGT primary arming from session 74 (the file convention) gives the same 20 trades',
    { skip: missing('VGT') },
    async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'phenotype-execution-'));

      try {
        const profile = await fs.readJson('config/execution/multi-etf-d1.json');

        delete profile.firstEligibleDate;
        await fs.writeJson(path.join(directory, 'file-native.json'), { ...profile, name: 'file-native' });

        const native = await runOf({
          symbol: 'VGT',
          phenotype: 'primary',
          execution: 'file-native',
          executionRoot: directory
        });

        assert.equal(
          native.dataset.simulated[native.dataset.firstEligibleIndex]!.date,
          native.dataset.simulated[74]!.date
        );
        compareTrades(tradesOf(native), (await vgtReference()).trades, 'VGT file convention');
        near(native.report.accounting.netProfit, 183043.81914863546, 'VGT file convention net');
      } finally {
        await fs.remove(directory);
      }
    }
  );
});

describe('the development/holdout boundary carries the state', { skip: missing('KRE') }, () => {
  test('the holdout starts from the development close: nothing is reset', async () => {
    for (const phenotype of ['primary', 'lowDd']) {
      const run = await runOf({ symbol: 'KRE', phenotype });
      const development = segmentOf(run, 'development');
      const holdout = segmentOf(run, 'holdout');
      const full = segmentOf(run, 'full');

      assert.equal(development.endDate, '2023-12-29');
      assert.equal(holdout.startDate, '2024-01-02');
      assert.equal(holdout.openingMark, development.closingMark);
      near(full.net, development.net + holdout.net, `KRE ${phenotype}: full = development + holdout`);
    }
  });

  test('the development period equals a run truncated at 2023-12-29', async () => {
    const run = await runOf({ symbol: 'KRE', phenotype: 'primary' });
    const truncated = await runOf({ symbol: 'KRE', phenotype: 'primary', endDate: '2023-12-29' });
    const development = segmentOf(run, 'development');
    const developmentTrades = tradesOf(run).filter((trade) => trade.entryDate <= '2023-12-29');

    near(truncated.report.accounting.netProfit, development.net, 'net');
    near(truncated.report.accounting.minuteDrawdown.maximum, development.minuteDrawdown.maximum, 'minute DD');
    compareTrades(tradesOf(truncated), developmentTrades, 'truncated');
  });

  test("KRE's first 2024 trade is a continuation entry from a 2023 exit, which a restart on 2024-01-02 misses", async () => {
    for (const phenotype of ['primary', 'lowDd']) {
      const continuous = tradesOf(await runOf({ symbol: 'KRE', phenotype }));
      const restarted = tradesOf(await runOf({ symbol: 'KRE', phenotype, startDate: '2024-01-02' }));
      const firstHoldout = continuous.find((trade) => trade.entryDate >= '2024-01-02')!;
      const previous = continuous[continuous.indexOf(firstHoldout) - 1]!;

      assert.equal(firstHoldout.entryDate, '2024-02-01');
      assert.equal(firstHoldout.kind, 'continuation');
      assert.ok(previous.exitDate < '2024-01-02' && previous.profit > 0, 'armed by a profitable 2023 exit');
      assert.ok(!restarted.some((trade) => trade.entryDate === '2024-02-01'), 'a restart cannot make it');
    }
  });
});

describe('the command line', () => {
  const execute = promisify(execFile);
  const app = (args: string[]) =>
    execute(
      process.execPath,
      ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', 'src/app.ts', ...args],
      { maxBuffer: 64 * 1024 * 1024 }
    );

  test('refuses an unknown phenotype with the available names, before reading data', async () => {
    await assert.rejects(app([script, 'KRE', '--phenotype', 'nope']), (error: { code: number; stderr: string }) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Phenotype run refused: No phenotype 'nope' for KRE .*available: primary, lowDd/);
      return true;
    });
  });

  test('without --phenotype the strategy keeps its defaults', { skip: missing('VGT') }, async () => {
    const { stdout } = await app([script, 'VGT']);

    assert.doesNotMatch(stdout, /Phenotype run/);
    assert.match(
      stdout,
      /Strategy: trailing-buy21.6-rebound0.3-buffered-loss2.9-no-reentry-restriction-pullback9-window60/
    );
    assert.match(stdout, /Total net profit: \$183,044/);
    assert.match(stdout, /Maximum drawdown \(minute-sampled mark-to-market\): \$19,331/);
  });

  test(
    '--phenotype runs the strategy with its own output files plus phenotype-run.json',
    { skip: missing('XRT') },
    async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'phenotype-cli-'));

      try {
        const { stdout } = await app([script, 'XRT', '-', '-', '-', directory, '--phenotype', 'primary']);
        const record = await fs.readJson(path.join(directory, 'phenotype-run.json'));
        const summary = await fs.readJson(path.join(directory, 'summary.json'));
        const reference = await multiEtfReference('XRT', 'primary');

        assert.match(stdout, /=== Phenotype run ===/);
        assert.match(stdout, /Phenotype file: {2}config\/phenotypes\/D1\/XRT\.json/);
        assert.match(stdout, /Ignored parameters: none/);
        assert.match(stdout, /First eligible: {2}2017-06-15/);
        assert.match(
          stdout,
          /Phenotype applied: allIn-trailingBuy-postExitContinuation read all 8 phenotype parameters/
        );

        for (const file of ['trades.csv', 'daily.csv', 'states.csv', 'episodes.csv', 'setups.csv']) {
          assert.ok(await fs.pathExists(path.join(directory, file)), file);
        }

        // The strategy's own summary shows the phenotype's values.
        assert.equal(summary.targetPercentChange, 0.244);
        assert.equal(summary.trailingBuyPercentage, 0.02);
        assert.equal(summary.pullback, 0.065);
        assert.equal(summary.continuationWindow, 103);
        near(summary.netProfit, reference.net, 'strategy summary net');
        near(summary.minuteMaximumDrawdown, reference.minuteDrawdown, 'strategy summary minute DD');
        assert.equal(record.phenotype, 'primary');
        assert.equal(record.provenance.candidateId, 'd1-1ef686e749');
        near(
          record.periods.find((period: { label: string }) => period.label === 'holdout').net,
          reference.segments.holdout.net,
          'holdout'
        );
      } finally {
        await fs.remove(directory);
      }
    }
  );
});
