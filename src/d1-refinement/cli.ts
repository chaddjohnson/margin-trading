// The D1-refinement program's commands: `npm run d1-refinement -- <command> [options]`.
import { loadData, protocol, fullSpec, formatDollars, option } from './context.ts';
import { evaluateCandidate } from './evaluate.ts';
import { d1Params, describeParams, familyOf, parseParams } from './families.ts';
import { makeCaches } from './pool.ts';
import { baseline, stopDiagnostic } from './diagnose.ts';
import { a1Sweep, a2Local } from './study.ts';
import { stopVariants } from './trackB.ts';
import { noDip } from './trackC.ts';
import { generateAll } from './generate.ts';
import { runParity } from './parity.ts';
import { evaluateFinalists } from './finalists.ts';

const commands: Record<string, (args: string[]) => Promise<void>> = {
  baseline: async () => baseline(await loadData()),
  'stop-diagnostic': async () => stopDiagnostic(await loadData()),
  'a1-sweep': async (args) => a1Sweep(await loadData(), args),
  'a2-local': async (args) => a2Local(await loadData(), args),
  'stop-variants': async (args) => stopVariants(await loadData(), args),
  'no-dip': async (args) => noDip(await loadData(), args),
  parity: async (args) => runParity(await loadData(), args),
  finalists: async (args) => evaluateFinalists(await loadData(), args),
  generate: async (args) => {
    for (const file of await generateAll(option(args, 'only')?.split(','))) {
      console.info(`Generated ${file.file} (${file.bytes} bytes)`);
    }
  },
  // Reproduces Set 2 and D1 through the engine and times evaluations.
  smoke: async () => {
    const { ds } = await loadData();
    const caches = makeCaches(ds);
    const started = Date.now();

    console.info(
      `Session ${protocol.eligibilityIndex} is ${ds.dates[protocol.eligibilityIndex]}; ${ds.sessionCount} sessions to ${ds.lastDate}`
    );

    for (const key of ['base', 'd1']) {
      const family = familyOf(key);
      const { metrics, detail } = evaluateCandidate(ds, caches, family, d1Params(family), fullSpec(ds), true);

      console.info(
        `${key} (${describeParams(family, d1Params(family))}): net ${formatDollars(metrics.net)}, minute DD ${formatDollars(metrics.minuteDrawdown)}, daily DD ${formatDollars(metrics.dailyDrawdown)}, ${metrics.closedTrades} closed${metrics.openAtEnd ? ' + 1 open' : ''}, interest ${formatDollars(metrics.interest)}`
      );

      for (const trade of detail!.trades) {
        console.info(
          `  ${trade.kind.padEnd(12)} ${ds.dates[trade.entryIndex]} ${trade.entryPrice.toFixed(2)} -> ${trade.exitIndex < 0 ? 'open' : `${ds.dates[trade.exitIndex]} ${trade.exitPrice.toFixed(2)} (${trade.reason})`}; stop first active ${trade.stopFirstActiveIndex >= 0 ? ds.dates[trade.stopFirstActiveIndex] : 'never'}, ${trade.stopActiveSessions} active, ${trade.stopSwitchOffSessions} off after active`
        );
      }
    }

    const timing = Date.now();
    const runs = 20;
    const d1 = familyOf('d1');

    for (let index = 0; index < runs; index++) {
      evaluateCandidate(ds, caches, d1, d1Params(d1, { pullback: 60 + index * 2 }), fullSpec(ds));
    }

    console.info(
      `${runs} evaluations: ${((Date.now() - timing) / runs).toFixed(0)} ms each (${Date.now() - started} ms in all)`
    );
  },
  show: async (args) => {
    const { ds } = await loadData();
    const caches = makeCaches(ds);
    const family = familyOf(option(args, 'family') ?? 'd1');
    const params = d1Params(family, parseParams(option(args, 'params')));
    const rate = Number(option(args, 'rate') ?? protocol.marginInterestRate);
    const { metrics, detail } = evaluateCandidate(
      ds,
      caches,
      family,
      params,
      fullSpec(ds, protocol.stopFill, rate),
      true
    );

    console.info(`${family.key}: ${describeParams(family, params)} at ${rate * 100}%`);
    console.info(
      `net ${formatDollars(metrics.net)}, minute DD ${formatDollars(metrics.minuteDrawdown)}, daily DD ${formatDollars(metrics.dailyDrawdown)}, ${metrics.entries} entries, ${metrics.wins}/${metrics.losses}, interest ${formatDollars(metrics.interest)}, exposure ${(metrics.exposure * 100).toFixed(0)}%`
    );

    detail!.trades.forEach((trade, index) => {
      const outcome = detail!.accounting.outcomes[index]!;

      console.info(
        `  ${String(index + 1).padStart(2)} ${trade.kind.padEnd(12)} ${ds.dates[trade.entryIndex]} ${trade.entryPrice.toFixed(2)} -> ${trade.exitIndex < 0 ? 'open' : `${ds.dates[trade.exitIndex]} ${trade.exitPrice.toFixed(2)} (${trade.reason})`} ${formatDollars(outcome.profit)}; stop first active ${trade.stopFirstActiveIndex >= 0 ? ds.dates[trade.stopFirstActiveIndex] : 'never'}`
      );
    });
  }
};

export const run = async (args: string[]) => {
  const [command, ...rest] = args;
  const handler = command ? commands[command] : undefined;

  if (!handler) {
    throw new Error(`Unknown command ${command ?? '(none)'}; commands: ${Object.keys(commands).join(', ')}`);
  }

  await handler(rest);
};
