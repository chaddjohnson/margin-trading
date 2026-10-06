const [, , script] = process.argv;

if (!script) {
  console.error('❌ Please provide a script name');
  process.exit(1);
}

const run = async () => {
  try {
    const mod = await import(`./app/${script}.ts`);
    const fn = (mod?.default as any)?.default ?? mod?.default;

    if (typeof fn === 'function') {
      await fn();
    } else {
      console.log(`✅ Loaded ${script}.js but no default export found.`);
    }
  } catch (err) {
    console.error(`❌ Failed to run '${script}':`, err);
    process.exit(1);
  }
};

run();
