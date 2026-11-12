// The command line of vg-l0-session-hold (the New L0 trading-session re-optimization). Run from the repository root:
//   npm run vg-l0sh -- <command> [options]
//
//   doors                                   verify the canonical files, every prefix door pin and the endpoint
//   bench --door D24 --centres N --workers W --label L [--warm K]     the pilot's throughput bench (cache only)
//   launch --unit NAME [--wait] -- <command and options>   (a transient systemd user unit inside the study slice)
//   verify                                  every sealed record against results/seals.jsonl
//   (the study stages are added below; each refuses to run without the preflight and its guards)
import { runBench } from './bench.ts';
import { log } from './context.ts';
import { verifyDoors } from './doors.ts';
import { launch } from './launch.ts';
import { logDoor, verifySeals } from './records.ts';
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
    case 'doors': {
      const v = verifyDoors();

      logDoor('pins', 'door verification (no data parsed beyond the pin checks)', {});
      console.log(JSON.stringify(v, null, 1));
      return;
    }
    case 'bench':
      await runBench({
        door: (opt('door', 'D24') as 'D24') ?? 'D24',
        centres: Number(opt('centres', '192')),
        workers: Number(opt('workers', '14')),
        label: opt('label', 'bench')!,
        warm: Number(opt('warm', '2')),
        units: opt('units', 'ses')!.split(',') as ('cal' | 'ses')[]
      });
      return;
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

await main();
