// Command line for the trailing-buy variants program. See research/trailing-buy-variants/README.md.
//
//   npm run trailing-buy-variants -- <command> [--fits a,b] [--families a,b] [--workers N]
export const runCli = async (args: string[]) => {
  const [command] = args;
  const index = args.indexOf('--workers');
  const workers = index >= 0 ? Number(args[index + 1]) : undefined;
  const log = (message: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

  if (command === 'parity') {
    const { runParity } = await import('./parity.ts');

    await runParity(args, log);

    return;
  }

  const { runStudyCommand } = await import('./study.ts');

  await runStudyCommand(command ?? '', args, { workers, log });
};
