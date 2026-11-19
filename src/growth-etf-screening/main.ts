// The command line of growth-etf-screening (Priority 7A). Run from the repository root:
//   npm run getf -- <command> [options]
//
//   universe                                the sealed universe manifest, the door manifest and the development scan
//   launch --unit NAME [--wait] [--env K=V] -- <command and options>   (a transient systemd user unit in the slice)
//   verify                                  every sealed record against results/seals.jsonl
//   (the engineering and study stages are in commands.ts; each refuses to run without its guards)
import { log } from './context.ts';
import { EXIT_STOPPED, JobStopped } from './lab.ts';
import { launch } from './launch.ts';
import { verifySeals } from './records.ts';
import { commands } from './commands.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1]! : fallback;
};
const flag = (name: string) => args.includes(`--${name}`);

const main = async () => {
  switch (command) {
    case 'verify': {
      const v = verifySeals();

      console.log(`${v.ok} sealed record(s) verify${v.failed.length ? `; FAILED: ${v.failed.join(', ')}` : ''}`);
      if (v.failed.length) process.exit(1);
      return;
    }
    case 'launch': {
      const unit = opt('unit');
      const rest = args.slice(args.indexOf('--') + 1);

      if (!unit || !args.includes('--')) throw new Error('launch --unit NAME [--wait] [--env K=V] -- <command>');

      const env = Object.fromEntries(
        args
          .slice(0, args.indexOf('--'))
          .flatMap((a, i, all) => (a === '--env' ? [all[i + 1]!] : []))
          .map((kv) => [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)])
      );
      const r = launch(unit, rest, { wait: flag('wait'), env });

      log(`launch ${unit}: status ${r.status}; slice ${r.slice.replaceAll('\n', ', ')}; log ${r.logFile}`);
      if (r.stderr.trim()) console.error(r.stderr.trim());
      if (r.status !== 0) process.exit(r.status ?? 1);
      return;
    }
    default: {
      const run = commands[command ?? ''];

      if (!run) throw new Error(`unknown command ${command}`);
      await run(args, opt, flag);
    }
  }
};

try {
  await main();
} catch (error) {
  if (error instanceof JobStopped) {
    log(`stopped (${error.reason}); resume with the same command`);
    process.exit(EXIT_STOPPED);
  }
  throw error;
}
