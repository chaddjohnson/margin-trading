// The study's commands. Every substantive stage refuses to run without the optimization-standard preflight and its
// guards (stages.ts studyGuards); a pilot (--pilot NAME) uses pilot budgets, `pilot-NAME-` job names and the cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runBench, runDupKeys } from './bench.ts';
import { studyPlan } from './budgets.ts';
import { cacheRoot, cutoffs, freezeFile, hardCeiling, log, repoRoot, researchDir, resources } from './context.ts';
import { freezeSelection, runDiagnostics, runFinalSelect, runValidation } from './final.ts';
import { runFoldEval, runSequential } from './folds.ts';
import { freezeProtocol } from './freeze.ts';
import { ledgerTotal } from './ledger.ts';
import { runParity } from './parity.ts';
import { sha256File } from './records.ts';
import { type Env, runScreenJob, runScreens, runSelect, studyEnv } from './stages.ts';
import { runTransferJob, runTransfers, sealTransferManifest, transferVectors } from './transfer.ts';
import { buildUniverse, eligibleSymbols, sealR1 } from './universe.ts';
import { archiveAudit } from './audit.ts';

export type Opt = (name: string, fallback?: string) => string | undefined;
export type Flag = (name: string) => boolean;

export const envOf = (opt: Opt): Env => {
  const workers = Number(opt('workers', String(resources.workers)));
  const pilot = opt('pilot');

  if (!pilot) {
    if (opt('stop-after') || opt('kill-worker-after') || opt('symbols'))
      throw new Error('interruption and subset options are for pilot runs only');
    return studyEnv(workers);
  }

  return {
    schedule: 'pilot',
    prefix: `pilot-${pilot}-`,
    outDir: path.join(cacheRoot, 'pilot', pilot),
    workers,
    symbols: opt('symbols')?.split(','),
    planKey: opt('pilot-budget') === 'study' ? 'study' : 'pilot',
    stopAfterFresh: opt('stop-after') ? Number(opt('stop-after')) : undefined,
    killWorkerAfter: opt('kill-worker-after') ? Number(opt('kill-worker-after')) : undefined
  };
};

export const cutoffArg = (opt: Opt) => {
  const c = opt('cutoff');

  if (!c || !cutoffs[c]) throw new Error(`--cutoff must be one of ${Object.keys(cutoffs).join(', ')}`);
  if (c === 'P18' && !opt('pilot')) throw new Error('P18 is the pilot pseudo-fold');
  if (c.startsWith('C') && opt('pilot')) throw new Error('a pilot uses the pseudo-fold P18, never a study cutoff');
  return c;
};

// Before the freeze only: the adoption manifest records the protocol's current sha256 and a new adoption time.
export const readopt = () => {
  if (fs.existsSync(freezeFile))
    throw new Error('the protocol is frozen: re-adoption is an amendment (a new manifest)');

  const file = path.join(researchDir, 'STANDARD_ADOPTION.json');
  const m = JSON.parse(fs.readFileSync(file, 'utf8')) as { protocol: { sha256: string }; adoptedAt: string };

  m.protocol.sha256 = sha256File(path.join(researchDir, 'PROTOCOL.md'));
  m.adoptedAt = execSync('date -u +%Y-%m-%dT%H:%M:%SZ', { cwd: repoRoot }).toString().trim();
  fs.writeFileSync(file, `${JSON.stringify(m, null, 1)}\n`);
  log(`re-adopted: protocol ${m.protocol.sha256.slice(0, 12)}…, adoptedAt ${m.adoptedAt}`);
};

// The plan check: the ledger so far plus every remaining worst case must fit the hard ceiling.
export const planCheck = () => {
  const plan = studyPlan(eligibleSymbols().length, transferVectors().length);
  const used = ledgerTotal().fresh;

  return {
    ...plan,
    ceiling: hardCeiling,
    spentSoFar: used,
    worstCaseTotal: used + plan.worstCase,
    fits: used + plan.worstCase <= hardCeiling
  };
};

export const commands: Record<string, (args: string[], opt: Opt, flag: Flag) => Promise<void>> = {
  universe: async () => {
    const u = await buildUniverse();

    log(
      `universe sealed: ${u.eligible.length} eligible, ${u.untested.length} untested (${u.untested.map((x) => x.symbol).join(', ')})`
    );
  },
  'universe-r1': async () => {
    const r = sealR1();

    log(`universe R1 sealed: ${r.eligible.length} eligible; excluded ${r.excluded.map((x) => x.symbol).join(', ')}`);
  },
  'transfer-manifest': async () => {
    const m = sealTransferManifest();

    log(`transfer manifest sealed: ${m.vectors.map((v) => `${v.key} ${v.identity}`).join(', ')}`);
  },
  parity: async (_a, opt, flag) => {
    await runParity({ dry: flag('dry'), symbols: opt('symbols')?.split(',') });
  },
  ledger: async () => {
    console.log(JSON.stringify(ledgerTotal()));
  },
  plan: async () => {
    console.log(JSON.stringify(planCheck(), null, 1));
  },
  readopt: async () => readopt(),
  'freeze-protocol': async () => {
    const p = planCheck();

    if (!p.fits) throw new Error(`the plan does not fit the ceiling: ${JSON.stringify(p)}`);
    freezeProtocol({
      proposalPlans: p,
      evaluationCaps: {
        hardCeiling,
        screenJobCap: p.screenJobCap,
        transferJobCap: p.transferJobCap,
        downstreamReserve: p.downstreamReserve
      }
    });
  },
  bench: async (_a, opt) => {
    await runBench({
      sym: opt('symbol', 'XLK')!,
      centres: Number(opt('centres', '192')),
      workers: Number(opt('workers', '12')),
      label: opt('label', 'bench')!,
      warm: Number(opt('warm', '8'))
    });
  },
  'dup-keys': async (_a, opt) => {
    await runDupKeys({
      sym: opt('symbol', 'XLK')!,
      workers: Number(opt('workers', '4')),
      label: opt('label', 'dupkeys')!
    });
  },
  screen: async (_a, opt) => {
    const env = envOf(opt);
    const cut = cutoffArg(opt);
    const sym = opt('symbol');

    if (sym) await runScreenJob(cut, sym, env);
    else await runScreens(cut, env, Number(opt('concurrency', '1')));
  },
  select: async (_a, opt) => {
    await runSelect(cutoffArg(opt), envOf(opt));
  },
  'fold-eval': async (_a, opt) => {
    await runFoldEval(cutoffArg(opt), envOf(opt));
  },
  sequential: async (_a, opt) => {
    const env = envOf(opt);

    await runSequential(env, env.schedule === 'pilot' ? ['P18'] : ['C19', 'C21', 'C23']);
  },
  transfer: async (_a, opt) => {
    const env = envOf(opt);
    const sym = opt('symbol');

    if (sym) await runTransferJob(sym, env, env.schedule === 'study' ? 'C24' : 'P18');
    else await runTransfers(env, Number(opt('concurrency', '1')));
  },
  'final-select': async (_a, opt) => {
    await runFinalSelect(envOf(opt));
  },
  diagnostics: async (_a, opt) => {
    await runDiagnostics(envOf(opt));
  },
  'freeze-selection': async (_a, opt) => {
    freezeSelection(envOf(opt));
  },
  validate: async (_a, opt) => {
    await runValidation(envOf(opt));
  },
  // the pilot's identical-resumption check: the sealed search records of interrupted pilot runs equal the straight run's
  // (timings and compute counters excluded)
  'pilot-compare': async (args, opt) => {
    const [ref, ...others] = args.slice(1).filter((a) => !a.startsWith('--') && a !== opt('symbol'));
    const sym = opt('symbol', 'XLK')!;
    const lanes = (name: string) =>
      JSON.stringify(
        (
          JSON.parse(fs.readFileSync(path.join(cacheRoot, 'pilot', name, 'search', 'P18', `${sym}.json`), 'utf8')) as {
            lanes: unknown;
            shortlist: unknown;
          }
        ).lanes
      ) +
      JSON.stringify(
        (
          JSON.parse(fs.readFileSync(path.join(cacheRoot, 'pilot', name, 'qualify', 'P18', `${sym}.json`), 'utf8')) as {
            evidence: unknown;
          }
        ).evidence
      );
    const a = lanes(ref!);
    let bad = 0;

    for (const o of others) {
      const same = lanes(o) === a;

      log(`pilot-compare ${o} vs ${ref}: ${same ? 'identical search and qualification results' : 'DIFFERENT'}`);
      if (!same) bad++;
    }
    if (bad) process.exit(1);
  },
  'audit-compute': async (_a, _o, flag) => {
    const a = archiveAudit({ write: flag('write') });

    console.log(JSON.stringify(a.totals, null, 1));
  }
};
