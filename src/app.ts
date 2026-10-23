import { expandDatasetArguments, isDatasetPartition } from './lib/dataset.ts';
import { usesPhenotype } from './phenotype/detect.ts';

const [, , script, ...args] = process.argv;

if (!script) {
  console.error('❌ Please provide a script name');
  process.exit(1);
}

// The strategy entry points, src/app/allIn*.ts, take `[symbol] [start date] [end date] [data file] ...`, and may
// name a dataset partition after the symbol (src/lib/dataset.ts). Two of them read legacy daily bars instead of
// the minute partitions.
const dailyBarScripts = ['allIn-original', 'allIn-optimizable'];
const takesDataset = (name: string) => name.startsWith('allIn') && !dailyBarScripts.includes(name);

const run = async () => {
  try {
    if (dailyBarScripts.includes(script) && args.some(isDatasetPartition)) {
      throw new Error(`${script} reads legacy pipe-delimited daily bars, so the minute dataset partitions don't apply`);
    }

    // A strategy run with a named phenotype (src/phenotype/cli.ts); without the flag nothing changes.
    if (usesPhenotype(args)) {
      const { runPhenotypeCli } = await import('./phenotype/cli.ts');

      await runPhenotypeCli(script, args);
      return;
    }

    const mod = await import(`./app/${script}.ts`);
    const fn = (mod?.default as any)?.default ?? mod?.default;

    if (typeof fn === 'function') {
      await fn(...(takesDataset(script) ? expandDatasetArguments(args) : args));
    } else {
      console.log(`✅ Loaded ${script}.js but no default export found.`);
    }
  } catch (err) {
    console.error(`❌ Failed to run '${script}':`, err);
    process.exit(1);
  }
};

run();
