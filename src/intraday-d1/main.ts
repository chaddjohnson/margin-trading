// Intraday D1 (VGT) study CLI (research/intraday-d1-vgt/RUN_COMMANDS.md):
//   npm run intraday-d1 -- parity                 P1 (canonical D1 file) and P2/P3 (Study 8 trace) on the development door
//   npm run intraday-d1 -- search [--smoke]       Study 8's V-track search on the development door → results/search/
//   npm run intraday-d1 -- qualify                Q-gates, B1, PBO → results/qualify/
//   npm run intraday-d1 -- freeze                 roles, ranking → FROZEN_SELECTION.json (commit it before validate)
//   npm run intraday-d1 -- validate               the validation door, once → results/validation/
//   npm run intraday-d1 -- report                 tables, ledgers and diagnostics from the sealed records
//   npm run intraday-d1 -- run --B … --X … [--door development|full]   one parameter set (the strategy entry point)
//   npm run intraday-d1 -- diagnose               development-only diagnostics (report-only)
//   npm run intraday-d1 -- verify                 re-hash the chain
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { developmentDoor, frozenSelectionFile, resultFile } from './context.ts';
import { loadDevelopmentSessions } from './data.ts';
import { ParallelLab, doorView } from './lab.ts';
import { compareWithD1, compareWithStudy8Trace, dailyPrimaryParams, parityRun, readD1Trades } from './parity.ts';
import { minuteClock, sessionClock } from './periods.ts';
import { runFreeze, runQualification } from './qualify.ts';
import { runSearch } from './search.ts';
import { appendChain, git, log, readChain, recordDoor, verifyChain, writeSealed } from './seal.ts';
import { engineParamsOf, sobolGrids, valuesOf } from './space.ts';

const [command, ...args] = process.argv.slice(2);
const searchFile = resultFile('search', 'search.json');
const qualificationFile = resultFile('qualify', 'qualification.json');

const developmentView = async (purpose: string) => {
  if (await fs.pathExists(frozenSelectionFile)) {
    throw new Error(`the selection is frozen (${frozenSelectionFile}); development stages refuse to run again`);
  }

  const loaded = await loadDevelopmentSessions();

  await recordDoor('development', purpose, loaded.sha256, loaded.lastDate);
  log(
    `development door opened for ${purpose}: ${loaded.firstDate} → ${loaded.lastDate}, ${loaded.rows} rows, sha256 ${loaded.sha256.slice(0, 16)}`
  );
  return doorView('development', loaded.sessions);
};

const requirePhase = async (phase: string) => {
  const chain = await readChain();

  if (!chain.some((entry) => entry.phase === phase)) throw new Error(`phase ${phase} is not sealed yet`);

  const verified = await verifyChain();

  if (verified.problems.length) throw new Error(`chain verification failed: ${verified.problems.join('; ')}`);
};

const parity = async () => {
  const out = resultFile('parity', 'parity.json');

  if (await fs.pathExists(out)) throw new Error(`${out} exists`);

  const view = await developmentView('parity P1–P3');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-d1-parity-'));
  const prefix = path.join(tmp, 'VGT-development-prefix.csv');
  const handle = await fs.promises.open('data/VGT/data.csv', 'r');
  const buffer = Buffer.alloc(developmentDoor.prefixBytes);

  await handle.read(buffer, 0, buffer.length, 0);
  await handle.close();
  await fs.writeFile(prefix, buffer);

  const p1: Record<string, unknown> = {};

  for (const fill of ['stop', 'next-open'] as const) {
    const outDir = path.join(tmp, fill);

    await fs.ensureDir(outDir);
    // the canonical D1 file, unchanged, on the same bytes (explicit-file path: no partition, no split, no warm-up)
    execFileSync(
      process.execPath,
      [
        '--experimental-transform-types',
        '--disable-warning=ExperimentalWarning',
        'src/app.ts',
        'allIn-trailingBuy-postExitContinuation',
        'VGT',
        '-',
        '-',
        prefix,
        outDir,
        fill
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] }
    );

    const summary = (await fs.readJson(path.join(outDir, 'summary.json'))) as Record<string, number>;
    const result = parityRun(view.market, view.sessions, fill);
    const problems = compareWithD1(result, view.sessions, readD1Trades(path.join(outDir, 'trades.csv')));

    p1[fill] = {
      trades: result.lots.length,
      engine: { net: result.net, minuteDd: result.minuteDrawdown.maximum, dailyDd: result.dailyDrawdown.maximum },
      d1: { net: summary.netProfit, minuteDd: summary.minuteMaximumDrawdown, dailyDd: summary.maximumDrawdown },
      problems
    };
    log(`P1 ${fill}: ${result.lots.length} trades, ${problems.length} differences`);
  }

  const arm = view.window.armFromSession;
  const variants = [
    { key: 'base', costBps: 5, rate: 0.11, stopFill: 'stop' as const, stopSlippageBps: 0 },
    { key: 'cost10', costBps: 10, rate: 0.11, stopFill: 'stop' as const, stopSlippageBps: 0 },
    { key: 'rate14', costBps: 5, rate: 0.14, stopFill: 'stop' as const, stopSlippageBps: 0 },
    { key: 'nextOpen', costBps: 5, rate: 0.11, stopFill: 'next-open' as const, stopSlippageBps: 0 },
    { key: 'slip25', costBps: 5, rate: 0.11, stopFill: 'stop' as const, stopSlippageBps: 25 }
  ];
  const p3 = variants.map(({ key, ...v }) => {
    const r = compareWithStudy8Trace(
      view.market,
      view.sessions,
      sessionClock(view.market, view.sessions),
      dailyPrimaryParams,
      { principal: 100000, ...v },
      arm
    );

    return { key, lots: r.lots, net: r.net, problems: r.problems };
  });
  const { grids } = sobolGrids(60, ['parity', 'P2']);
  const p2 = grids.map((grid, n) => {
    const values = valuesOf(grid);
    const { key, ...v } = variants[n % variants.length]!;
    const r = compareWithStudy8Trace(
      view.market,
      view.sessions,
      minuteClock(view.market, view.sessions, values.periodMinutes),
      engineParamsOf(values),
      { principal: 100000, ...v, rate: 0 },
      arm
    );

    return { grid, settings: key, lots: r.lots, net: r.net, problems: r.problems };
  });
  const total = [
    ...Object.values(p1).map((x) => (x as { problems: string[] }).problems.length),
    ...p3.map((x) => x.problems.length),
    ...p2.map((x) => x.problems.length)
  ].reduce((a, b) => a + b, 0);
  const record = await writeSealed(out, { stage: 'PARITY', p1, p3, p2, differences: total });

  await fs.remove(tmp);
  log(
    `parity: ${total} differences (P1 2 runs, P3 ${p3.length}, P2 ${p2.length}); sealed ${record.bodyHash.slice(0, 12)}`
  );

  if (total > 0) throw new Error('parity failed');

  await appendChain('parity', [out]);
};

const run = async () => {
  switch (command) {
    case 'parity':
      return parity();
    case 'search': {
      const smoke = args.includes('--smoke');

      if (!smoke) await requirePhase('protocol');

      const view = await developmentView(smoke ? 'smoke search' : 'search');
      const lab = new ParallelLab(view, { door: 'development' });
      const out = smoke ? resultFile('smoke', 'search-smoke.json') : searchFile;

      try {
        await runSearch(lab, view, { mode: smoke ? 'smoke' : 'base', out });
      } finally {
        await lab.close();
      }

      if (!smoke) await appendChain('search', [searchFile, searchFile.replace(/\.json$/, '-archive.csv.gz')]);
      return;
    }
    case 'qualify': {
      await requirePhase('search');

      const view = await developmentView('qualification');
      const lab = new ParallelLab(view, { door: 'development' });

      try {
        await runQualification(lab, view, searchFile, qualificationFile);
      } finally {
        await lab.close();
      }

      await appendChain('qualify', [qualificationFile]);
      return;
    }
    case 'freeze': {
      await requirePhase('qualify');

      const protocolCommit = git('log -1 --format=%H -- research/intraday-d1-vgt/PROTOCOL.md');

      await runFreeze(qualificationFile, searchFile, protocolCommit);
      await appendChain('selection', [frozenSelectionFile]);
      return;
    }
    case 'validate': {
      const { runValidation } = await import('./validate.ts');

      return runValidation();
    }
    case 'report': {
      const { runReport } = await import('./report.ts');

      return runReport(args);
    }
    case 'run': {
      const { runOne } = await import('./run.ts');

      return runOne(args);
    }
    case 'diagnose': {
      const { runDiagnostics } = await import('./diagnostics.ts');

      return runDiagnostics();
    }
    case 'verify': {
      const result = await verifyChain();

      console.log(JSON.stringify(result, null, 1));
      if (result.problems.length) process.exitCode = 1;
      return;
    }
    case 'seal-protocol': {
      // the protocol and the code are frozen together before the search (chain phase "protocol")
      const { codeDigest } = await import('./seal.ts');
      const code = await codeDigest();
      const out = resultFile('protocol_freeze.json');

      await writeSealed(out, { stage: 'PROTOCOL_FREEZE', protocol: 'research/intraday-d1-vgt/PROTOCOL.md', code });
      await appendChain('protocol', ['research/intraday-d1-vgt/PROTOCOL.md', out]);
      log(`protocol frozen: code digest ${code.digest.slice(0, 16)}`);
      return;
    }
    default:
      throw new Error(`unknown command ${command ?? '(none)'}; see src/intraday-d1/main.ts`);
  }
};

await run();
