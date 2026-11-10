// The study stages' commands. Every stage refuses to run without the optimization-standard preflight and its guards
// (stages.ts studyGuards); a pilot (--pilot NAME) uses pilot budgets, `pilot-NAME-` job names and the git-ignored cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { evaluationCaps, proposalPlan } from './budgets.ts';
import { runDupKeys } from './bench.ts';
import { cacheRoot, controlManifestFile, freezeFile, log, repoRoot, researchDir, resources } from './context.ts';
import { controlManifest } from './controls.ts';
import { runDiagnostics } from './diagnostics.ts';
import { freezeSelection, runValidation } from './final.ts';
import { runFoldEval, runSequential } from './folds.ts';
import { freezeProtocol } from './freeze.ts';
import { runParity } from './parity.ts';
import { sealJson, sha256File } from './records.ts';
import { type Env, type LaneName, cutoffs, lanesFor, runQualify, runSearch, studyEnv } from './stages.ts';

export type Opt = (name: string, fallback?: string) => string | undefined;
export type Flag = (name: string) => boolean;

export const envOf = (opt: Opt): Env => {
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

const cutoffArg = (opt: Opt) => {
  const c = opt('cutoff');

  if (!c || !cutoffs[c]) throw new Error(`--cutoff must be one of ${Object.keys(cutoffs).join(', ')}`);
  if (c === 'P18' && !opt('pilot')) throw new Error('P18 is the pilot pseudo-fold');
  if (c.startsWith('C') && opt('pilot')) throw new Error('a pilot uses the pseudo-fold P18, never a study cutoff');
  return c;
};

const laneArg = (opt: Opt): LaneName => {
  const l = opt('lane', 'independent');

  if (l !== 'independent' && l !== 'informed') throw new Error('--lane must be independent or informed');
  return l;
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

// The per-cutoff proposal plans (deterministic: the seeds, their designs and the budgets; no evaluation).
export const proposalPlans = (env: Env = studyEnv(resources.workers)) =>
  Object.fromEntries(
    ['C19', 'C21', 'C23', 'C24'].map((c) => {
      const ind = lanesFor(cutoffs[c]!, env, 'independent');
      const inf = c === 'C24' ? lanesFor(cutoffs[c]!, env, 'informed') : null;

      return [
        c,
        {
          independent: ind.plan.independent,
          informed: inf?.plan.informed ?? null,
          informedSeeds: inf?.seeds.length ?? 0,
          budgets: Object.fromEntries([...ind.lanes, ...(inf?.lanes ?? [])].map((l) => [l.spec.key, l.budget]))
        }
      ];
    })
  );

export const commands: Record<string, (args: string[], opt: Opt, flag: Flag) => Promise<void>> = {
  readopt: async () => readopt(),
  'control-manifest': async (_a, _o, flag) => {
    const m = controlManifest();

    if (flag('dry-run')) console.log(JSON.stringify(m, null, 1).slice(0, 8000));
    else sealJson(controlManifestFile, m, 'control manifest');
  },
  plan: async () => {
    console.log(JSON.stringify({ proposalPlans: proposalPlans(), evaluationCaps }, null, 1));
  },
  parity: async () => {
    await runParity();
  },
  'freeze-protocol': async () => {
    freezeProtocol({ proposalPlans: proposalPlans(), evaluationCaps });
  },
  search: async (_a, opt) => {
    await runSearch(cutoffArg(opt), envOf(opt), laneArg(opt));
  },
  qualify: async (_a, opt) => {
    await runQualify(cutoffArg(opt), envOf(opt));
  },
  'fold-eval': async (_a, opt) => {
    await runFoldEval(cutoffArg(opt), envOf(opt));
  },
  sequential: async (_a, opt) => {
    const env = envOf(opt);

    await runSequential(env, env.schedule === 'pilot' ? ['P18'] : ['C19', 'C21', 'C23']);
  },
  diagnostics: async (_a, opt) => {
    await runDiagnostics(envOf(opt));
  },
  'freeze-selection': async (_a, opt) => {
    await freezeSelection(envOf(opt));
  },
  validate: async (_a, opt) => {
    await runValidation(envOf(opt));
  },
  'dup-keys': async (_a, opt) => {
    await runDupKeys({
      door: (opt('door', 'D19') as 'D19') ?? 'D19',
      workers: Number(opt('workers', '4')),
      label: opt('label', 'dupkeys')!
    });
  },
  // the pilot's identical-resumption check: the sealed P18 lane results of interrupted pilot runs equal the straight
  // run's (timings and compute counters excluded)
  'pilot-compare': async (args) => {
    const [ref, ...others] = args.slice(1);
    // the interruption tests run the independent lane; its sealed lane results must equal the straight run's
    const lanes = (name: string) =>
      JSON.stringify(
        (
          JSON.parse(
            fs.readFileSync(path.join(cacheRoot, 'pilot', name!, 'search', 'P18', 'independent.json'), 'utf8')
          ) as { lanes: unknown }
        ).lanes
      );
    const a = lanes(ref!);
    let bad = 0;

    for (const o of others) {
      const same = lanes(o) === a;

      log(`pilot-compare ${o} vs ${ref}: ${same ? 'identical lane results' : 'DIFFERENT'}`);
      if (!same) bad++;
    }
    if (bad) process.exit(1);
  },
  'proposal-plan': async (_a, opt) => {
    const env = envOf(opt);

    console.log(JSON.stringify(proposalPlan(env.schedule, Number(opt('designs', '400')))));
  }
};
