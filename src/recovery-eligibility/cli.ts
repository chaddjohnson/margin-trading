// The recovery-eligibility program's commands: `npm run recovery-eligibility -- <command> [options]`.
import { ReferenceHighCache } from '../four-family/data.ts';
import { loadData, protocol, fullSpec, formatDollars } from './context.ts';
import { evaluateCandidate } from './evaluate.ts';
import { families, set2Params } from './families.ts';
import { controls, counterfactuals, rootCause } from './diagnose.ts';
import { search, sweeps, validate } from './study.ts';
import { generateAll } from './generate.ts';
import { runParity } from './parity.ts';
import { show } from './inspect.ts';
import { evaluateFinalists, mechanismWalkForward, tables } from './final.ts';

const commands: Record<string, (args: string[]) => Promise<void>> = {
  'root-cause': async () => rootCause(await loadData()),
  controls: async () => controls(await loadData()),
  counterfactuals: async () => counterfactuals(await loadData()),
  generate: async () => {
    for (const file of await generateAll()) {
      console.info(`Generated ${file.file}`);
    }
  },
  parity: async (args) => runParity(await loadData(), args),
  'mechanism-walk-forward': async (args) => mechanismWalkForward(await loadData(), args),
  finalists: async () => evaluateFinalists(await loadData()),
  tables: async () => tables(await loadData()),
  show: async (args) => show(await loadData(), args),
  sweeps: async (args) => sweeps(await loadData(), args),
  search: async (args) => search(await loadData(), args),
  validate: async (args) => validate(await loadData(), args),
  // Reproduces Set 2 through the engine and times evaluations.
  smoke: async () => {
    const { ds } = await loadData();
    const highs = new ReferenceHighCache(ds);
    const base = families.base!;
    const params = set2Params(base);
    const spec = fullSpec(ds, 'stop', 0.11, 74);
    const started = Date.now();
    const { metrics, detail } = evaluateCandidate(ds, highs, 'base', params, spec, true);

    console.info(
      `Session ${protocol.eligibilityIndex} is ${ds.dates[protocol.eligibilityIndex]}; ${ds.sessionCount} sessions to ${ds.lastDate}`
    );
    console.info(
      `Set 2 through the engine (arming from session 74 as the file does): net ${formatDollars(metrics.net)}, minute DD ${formatDollars(metrics.minuteDrawdown)}, daily DD ${formatDollars(metrics.dailyDrawdown)}, ${metrics.closedTrades} closed${metrics.openAtEnd ? ' + 1 open' : ''}, interest ${formatDollars(metrics.interest)} (${Date.now() - started} ms with detail)`
    );

    for (const trade of detail!.trades) {
      console.info(
        `  ${ds.dates[trade.entryIndex]} ${trade.entryPrice.toFixed(2)} -> ${trade.exitIndex < 0 ? 'open' : `${ds.dates[trade.exitIndex]} ${trade.exitPrice.toFixed(2)} (${trade.reason})`}`
      );
    }

    const timing = Date.now();
    const runs = 10;

    for (let index = 0; index < runs; index++) {
      evaluateCandidate(ds, highs, 'base', { ...params, targetPercentChange: 100 + index * 10 }, fullSpec(ds));
    }

    console.info(`${runs} evaluations at X 10%..19%: ${((Date.now() - timing) / runs).toFixed(0)} ms each`);
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
