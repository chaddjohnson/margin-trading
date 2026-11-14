// The command line of vg-l0-risk-families (Assignment 2: D1 risk-control families and risk-aware selection). Run from the
// repository root:   npm run vg-l0rf -- <command> [options]
//
//   doors                                         verify the canonical files, every prefix door pin and the endpoint
//   verify                                        every sealed record against results/seals.jsonl
//   launch --unit NAME [--wait] [--env K=V] -- <command and options>   a transient systemd user unit in the study slice
//   bench --door D24 --centres N --workers W --label L [--warm K]       the pilot's throughput bench (cache only)
//   parity [--dry-run]                            stage V (sealed; --dry-run prints only)
//   readopt                                       before the freeze: refresh the adoption manifest's protocol hash
//   freeze-protocol                               the protocol freeze (sealed)
//   search --cutoff C --part base|onset1|onset2|refine   (pilot: --pilot NAME --cutoff P18 --part pilot|refine)
//   qualify --cutoff C --stage broad|refine
//   refine-plan --cutoff C
//   select --cutoff C
//   fold-eval --cutoff C
//   sequential
//   freeze-selection
//   validate
//   pilot-compare REF OTHER…                      identical lane results of interrupted pilot runs
// Every stage refuses to run without the optimization-standard preflight and its guards (stages.ts studyGuards).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runBench } from './bench.ts';
import { cacheRoot, freezeFile, log, repoRoot, researchDir, resources } from './context.ts';
import { verifyDoors } from './doors.ts';
import { launch } from './launch.ts';
import { logDoor, sha256File, verifySeals } from './records.ts';
import { freezeProtocol } from './freeze.ts';
import { runParity } from './parity.ts';
import { freezeSelection, runValidation } from './final.ts';
import { runFoldEval, runSequential } from './folds.ts';
import { type Env, type Part, cutoffs, runQualify, runRefineSelect, runSearch, runSelect, studyEnv } from './stages.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1]! : fallback;
};
const flag = (name: string) => args.includes(`--${name}`);

const envOf = (): Env => {
  const workers = Number(opt('workers', String(resources.workers)));
  const pilot = opt('pilot');

  if (!pilot) {
    if (opt('stop-after') || opt('kill-worker-after')) throw new Error('interruption options are for pilot runs only');
    return studyEnv(workers);
  }

  return {
    schedule: 'pilot',
    prefix: `pilot-${pilot}-`,
    outDir: path.join(cacheRoot, 'pilot', pilot),
    workers,
    stopAfterFresh: opt('stop-after') ? Number(opt('stop-after')) : undefined,
    killWorkerAfter: opt('kill-worker-after') ? Number(opt('kill-worker-after')) : undefined
  };
};

const cutoffArg = () => {
  const c = opt('cutoff');

  if (!c || !cutoffs[c]) throw new Error(`--cutoff must be one of ${Object.keys(cutoffs).join(', ')}`);
  if (c === 'P18' && !opt('pilot')) throw new Error('P18 is the pilot pseudo-fold');
  if (c.startsWith('C') && opt('pilot')) throw new Error('a pilot uses the pseudo-fold P18, never a study cutoff');
  return c;
};

const readopt = () => {
  if (fs.existsSync(freezeFile)) throw new Error('the protocol is frozen: re-adoption is an amendment (a new manifest)');

  const file = path.join(researchDir, 'STANDARD_ADOPTION.json');
  const m = JSON.parse(fs.readFileSync(file, 'utf8')) as { protocol: { sha256: string }; adoptedAt: string };

  m.protocol.sha256 = sha256File(path.join(researchDir, 'PROTOCOL.md'));
  m.adoptedAt = execSync('date -u +%Y-%m-%dT%H:%M:%SZ', { cwd: repoRoot }).toString().trim();
  fs.writeFileSync(file, `${JSON.stringify(m, null, 1)}\n`);
  log(`re-adopted: protocol ${m.protocol.sha256.slice(0, 12)}…, adoptedAt ${m.adoptedAt}`);
};

const main = async () => {
  switch (command) {
    case 'doors': {
      const v = verifyDoors();

      logDoor('pins', 'door verification (no data parsed beyond the pin checks)', {});
      console.log(JSON.stringify(v, null, 1));
      return;
    }
    case 'verify': {
      const v = verifySeals();

      console.log(`${v.ok} sealed record(s) verify${v.failed.length ? `; FAILED: ${v.failed.join(', ')}` : ''}`);
      if (v.failed.length) process.exit(1);
      return;
    }
    case 'launch': {
      const unit = opt('unit');

      if (!unit || !args.includes('--')) throw new Error('launch --unit NAME [--wait] [--env K=V] -- <command>');

      const rest = args.slice(args.indexOf('--') + 1);
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
    case 'bench':
      await runBench({
        door: (opt('door', 'D24') as 'D24') ?? 'D24',
        centres: Number(opt('centres', '196')),
        workers: Number(opt('workers', String(resources.workers))),
        label: opt('label', 'bench')!,
        warm: Number(opt('warm', '4'))
      });
      return;
    case 'parity':
      await runParity({ dry: flag('dry-run') });
      return;
    case 'readopt':
      readopt();
      return;
    case 'freeze-protocol':
      freezeProtocol();
      return;
    case 'search':
      await runSearch(cutoffArg(), opt('part') as Part, envOf());
      return;
    case 'qualify':
      await runQualify(cutoffArg(), opt('stage') as 'broad' | 'refine', envOf());
      return;
    case 'refine-plan':
      await runRefineSelect(cutoffArg(), envOf());
      return;
    case 'select':
      await runSelect(cutoffArg(), envOf());
      return;
    case 'fold-eval':
      await runFoldEval(cutoffArg(), envOf());
      return;
    case 'sequential': {
      const env = envOf();

      await runSequential(env, env.schedule === 'pilot' ? ['P18'] : ['C19', 'C21', 'C23']);
      return;
    }
    case 'freeze-selection':
      await freezeSelection(envOf());
      return;
    case 'validate':
      await runValidation(envOf());
      return;
    case 'pilot-compare': {
      const [ref, ...others] = args.slice(1).filter((a) => !a.startsWith('--'));
      const lanes = (name: string) => {
        const f = path.join(cacheRoot, 'pilot', name, 'search', 'P18', 'pilot.json');

        return JSON.stringify((JSON.parse(fs.readFileSync(f, 'utf8')) as { lanes: unknown }).lanes);
      };
      const a = lanes(ref!);
      let bad = 0;

      for (const o of others) {
        const same = lanes(o) === a;

        log(`pilot-compare ${o} vs ${ref}: ${same ? 'identical lane results' : 'DIFFERENT'}`);
        if (!same) bad++;
      }
      if (bad) process.exit(1);
      return;
    }
    default:
      throw new Error(`unknown command ${command}`);
  }
};

await main();
