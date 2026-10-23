import { usesPhenotype } from './phenotype/detect.ts';

const [, , script, ...args] = process.argv;

if (!script) {
  console.error('❌ Please provide a script name');
  process.exit(1);
}

const run = async () => {
  try {
    // A strategy run with a named phenotype (src/phenotype/cli.ts); without the flag nothing changes.
    if (usesPhenotype(args)) {
      const { runPhenotypeCli } = await import('./phenotype/cli.ts');

      await runPhenotypeCli(script, args);
      return;
    }

    const mod = await import(`./app/${script}.ts`);
    const fn = (mod?.default as any)?.default ?? mod?.default;

    if (typeof fn === 'function') {
      await fn(...args);
    } else {
      console.log(`✅ Loaded ${script}.js but no default export found.`);
    }
  } catch (err) {
    console.error(`❌ Failed to run '${script}':`, err);
    process.exit(1);
  }
};

run();
