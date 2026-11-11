// The stages (PROTOCOL.md §7–§12). Per cutoff: one SCREEN job per eligible ETF (its four lanes → the ETF shortlist →
// the selection family → the confirmation picks → confirmation, stresses and toggles; two sealed records: the search,
// then the qualification) → the cutoff SELECTION over the whole eligible universe (sealed and committed before its slice
// opens) → the fold evaluation (folds.ts). At C24: the transfer lane (transfer.ts), the final selection and the
// diagnostics, the frozen selection and the validation (final.ts). Each stage writes sealed records and refuses to rerun
// a sealed one. The pilot runs identical code with pilot budgets, `pilot-` job names and an output directory in the
// cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { type Schedule, plans, proposalsPerEtf, screenJobCap } from './budgets.ts';
import {
  type CutoffSpec,
  cacheRoot,
  cutoffs,
  finalCutoff,
  freezeFile,
  log,
  repoRoot,
  researchDir,
  resultsDir,
  transferManifestFile
} from './context.ts';
import { doorName } from './doors.ts';
import { assertFrozenCode } from './freeze.ts';
import { JobStopped, type Lab, withLab } from './lab.ts';
import { assertWithinCeiling } from './ledger.ts';
import {
  type Evidence,
  type Member,
  compactEvidence,
  confirmationPicks,
  qualifyMembers,
  rolesOf,
  summary
} from './qualify.ts';
import { isSealed, readJson, sealRecord, sha256File } from './records.ts';
import { Lane, type LaneResult, type LaneSpec, type Pick } from './search.ts';
import { type GConfig, build, gDistance } from './space.ts';
import { controls, eligibleSymbols, isControl, r1File } from './universe.ts';

export interface Env {
  schedule: Schedule;
  prefix: string; // job-name prefix ('' for the study; 'pilot-<run>-' for the pilot)
  outDir: string;
  workers: number;
  symbols?: string[]; // the pilot's subset; the study always screens every eligible ETF
  planKey?: Schedule; // the pilot may run the study's budgets (sizing); the study always runs its own
  stopAfterFresh?: number;
  killWorkerAfter?: number;
}

export const studyEnv = (workers: number): Env => ({ schedule: 'study', prefix: '', outDir: resultsDir, workers });
export const symbolsOf = (env: Env) =>
  env.schedule === 'study' ? eligibleSymbols() : (env.symbols ?? eligibleSymbols());

export const seal = (env: Env, file: string, value: unknown, stage: string) =>
  sealRecord(env.schedule, file, value, `${env.prefix}${stage}`, path.join(env.outDir, 'seals.jsonl'));

// A sealed record that must also be committed unchanged before the next door opens.
export const assertCommitted = (file: string) => {
  const rel = path.relative(repoRoot, file);

  try {
    execSync(`git ls-files --error-unmatch -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
    execSync(`git diff --quiet HEAD -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    throw new Error(`${rel} is not committed unchanged (the guard of the next stage)`);
  }
};

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

// The guards of a substantive stage: the optimization-standard preflight (every stage, the pilot included), the
// universe (R1), the protocol freeze (committed), the sealed engineering gates with 0 failures, the sealed transfer
// manifest and the frozen evaluation code.
export const studyGuards = (env: Env) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (!isSealed(r1File())) throw new Error('the universe (R1) is not sealed');
  if (env.schedule === 'pilot') return;
  if (!isSealed(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json)');
  assertCommitted(freezeFile);
  if (!isSealed(parityFile)) throw new Error('the engineering gates are not sealed (results/parity/parity.json)');
  if (readJson<{ failed: number }>(parityFile).failed !== 0)
    throw new Error('an engineering gate failed: every dependent stage is blocked');
  if (!isSealed(transferManifestFile)) throw new Error('the transfer manifest is not sealed');
  assertFrozenCode();
};

// ----- files -----

export const searchFile = (env: Env, cut: string, sym: string) => path.join(env.outDir, 'search', cut, `${sym}.json`);
export const qualifyFile = (env: Env, cut: string, sym: string) => path.join(env.outDir, 'qualify', cut, `${sym}.json`);
export const selectionFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');

// ----- the four lanes of one ETF × cutoff -----

export const lanesOf = (cut: string, sym: string): LaneSpec[] =>
  (['A', 'B'] as const).flatMap((rep) =>
    (['rise', 'breakout'] as const).map((entry) => ({
      key: `${cut}/${sym}/${rep}-${entry}`,
      sym,
      cutoff: cut,
      rep,
      entry
    }))
  );

// The ETF shortlist (frozen): ≤ plan.shortlist distinct members of the lanes' picks (feasible rung-2 fits), one per
// funded ledger, L∞ ≥ 0.10 apart, in slot order: profit (the highest rung-2 centre net), robust (the highest rung-2
// robust net), balanced (rung-2 robust ÷ p90), seed-alternative (the highest centre net among the other paired seed's
// picks when only one seed is represented), then centre-net order. Ranks on search evidence only.
export const etfShortlist = (lanes: readonly LaneResult[], max: number) => {
  const all: Pick[] = lanes.flatMap((l) => l.picks);
  const byId = (a: Pick, b: Pick) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const out: { p: Pick; slot: string }[] = [];
  const take = (p: Pick | undefined, slot: string) => {
    if (!p || out.length >= max) return;
    if (out.some((o) => o.p.id === p.id || o.p.centre.signature === p.centre.signature || gDistance(o.p.g, p.g) < 0.1))
      return;
    out.push({ p, slot });
  };
  const rob = (p: Pick) => p.nb?.robust ?? -Infinity;
  const p90 = (p: Pick) => p.nb?.p90Dd ?? Infinity;
  const byNet = [...all].sort((a, b) => b.centre.net - a.centre.net || byId(a, b));

  take(byNet[0], 'profit');
  take([...all].sort((a, b) => rob(b) - rob(a) || byId(a, b))[0], 'robust');
  take(
    [...all].sort((a, b) => rob(b) / Math.max(1, p90(b)) - rob(a) / Math.max(1, p90(a)) || byId(a, b))[0],
    'balanced'
  );

  const reps = new Set(out.map((o) => o.p.lane.split('/').at(-1)!.split('-')[0]));

  if (reps.size === 1) {
    const other = reps.has('A') ? 'B' : 'A';

    for (const p of byNet.filter((x) => x.lane.split('/').at(-1)!.startsWith(`${other}-`))) {
      const before = out.length;

      take(p, 'seed-alternative');
      if (out.length > before) break;
    }
  }
  for (const p of byNet) take(p, 'profit order');
  return out;
};

const compactPick = (p: Pick) => ({
  id: p.id,
  pick: p.pick,
  lane: p.lane,
  origin: p.origin,
  g: p.g,
  violation: p.violation,
  centre: { net: p.centre.net, dd: p.centre.dd, lots: p.centre.lots, signature: p.centre.signature },
  nb: p.nb
});

const compactLane = (l: LaneResult) => ({ ...l, picks: l.picks.map(compactPick) });

// ----- the screen job of one ETF at one cutoff -----

export const runScreenJob = async (cutKey: string, sym: string, env: Env) => {
  const cut: CutoffSpec = cutoffs[cutKey]!;
  const sFile = searchFile(env, cutKey, sym);
  const qFile = qualifyFile(env, cutKey, sym);
  const plan = plans[env.planKey ?? env.schedule];
  const cap = screenJobCap(env.planKey ?? env.schedule);

  studyGuards(env);
  if (fs.existsSync(qFile)) return readJson<ScreenRecord>(qFile);
  if (fs.existsSync(selectionFile(env, cutKey))) throw new Error(`the ${cutKey} selection exists`);
  if (!symbolsOf(env).includes(sym)) throw new Error(`${sym} is not in this run's eligible universe`);

  assertWithinCeiling(cap, `the screen job ${cutKey} ${sym}`);

  const job = `${env.prefix}screen-${cutKey}-${sym}`;
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: doorName(sym, cut.door),
      purpose: `${env.prefix}screen ${cutKey} ${sym}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter,
      maxFresh: cap
    },
    async (lab) => {
      const cash = build(null);
      const [cashRec] = await lab.evalMany([{ quad: cash.quad, options: cash.options }], 'cash');
      let search: SearchRecord;

      if (fs.existsSync(sFile)) {
        if (!isSealed(sFile)) throw new Error(`${path.relative(repoRoot, sFile)} exists unsealed`);
        search = readJson<SearchRecord>(sFile);
      } else {
        lab.stage = `search ${cutKey} ${sym}: 4 lanes concurrently`;

        // the lanes run concurrently on the one worker pool; a finished lane's result is kept in the job directory and,
        // on a resume, replayed from the archive and required to reproduce it exactly
        const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
        const results = await Promise.all(
          lanesOf(cutKey, sym).map(async (spec) => {
            const result = await new Lane(lab, spec, plan.lane, cashRec!.signature).run();
            const f = laneFile(spec.key);
            const text = JSON.stringify(result);

            if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') !== text)
              throw new Error(`${spec.key}: the replay differs from the kept lane result`);
            fs.mkdirSync(path.dirname(f), { recursive: true });
            fs.writeFileSync(f, text);
            return result;
          })
        );
        const shortlist = etfShortlist(results, plan.shortlist);

        search = {
          stage: 'search',
          cutoff: cutKey,
          sym,
          door: cut.door,
          schedule: env.schedule,
          budget: plan.lane,
          proposalsPlanned: proposalsPerEtf(env.planKey ?? env.schedule),
          cashSignature: cashRec!.signature,
          lanes: results.map(compactLane),
          shortlist: shortlist.map((x, i) => ({
            label: `${cutKey}/${sym}#${i + 1} ${x.slot}`,
            slot: x.slot,
            ...compactPick(x.p)
          })),
          compute: lab.compute,
          codeDigest: lab.digest,
          finished: new Date().toISOString()
        };
        seal(env, sFile, search, `search ${cutKey} ${sym}`);
      }

      // qualification (selection family for the shortlist; confirmation for the picks)
      lab.stage = `qualify ${cutKey} ${sym}`;

      const members: Member[] = search.shortlist.map((s) => ({
        label: s.label,
        sym,
        kind: 'independent',
        lane: s.lane,
        origin: s.origin,
        pick: s.slot,
        g: s.g
      }));
      const fid = plan.fidelity;
      const sel = await qualifyMembers(
        lab,
        members.map((m) => ({ m, confirm: false })),
        cutKey,
        fid
      );
      const picks = confirmationPicks(sel, plan.confirmPicks);
      const conf = await qualifyMembers(
        lab,
        picks.map((e) => ({ m: members.find((m) => m.label === e.label)!, confirm: true })),
        cutKey,
        fid
      );
      const evidence: Evidence[] = sel.map((e) => conf.find((c) => c.label === e.label) ?? e);
      const roles = rolesOf(`${sym} ${cutKey} (independent)`, evidence);
      const record: ScreenRecord = {
        stage: 'qualify',
        cutoff: cutKey,
        sym,
        control: isControl(sym),
        door: cut.door,
        schedule: env.schedule,
        confirmationPicks: picks.map((e) => e.label),
        roles,
        summary: evidence.map(summary),
        evidence: evidence.map(compactEvidence),
        search: { file: path.relative(repoRoot, sFile), sha256: sha256File(sFile) },
        compute: lab.compute,
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      seal(env, qFile, record, `qualify ${cutKey} ${sym}`);
      log(
        `screen ${cutKey} ${sym}: ${roles.qualified} qualified of ${evidence.length}; actual-profit ${roles.roles['actual-profit'] ?? '—'}`
      );
      return record;
    }
  );
};

export interface SearchRecord {
  stage: string;
  cutoff: string;
  sym: string;
  door: string;
  schedule: Schedule;
  budget: unknown;
  proposalsPlanned: number;
  cashSignature: string;
  lanes: ReturnType<typeof compactLane>[];
  shortlist: (ReturnType<typeof compactPick> & { label: string; slot: string })[];
  compute: Lab['compute'];
  codeDigest: string;
  finished: string;
}

export interface ScreenRecord {
  stage: string;
  cutoff: string;
  sym: string;
  control: boolean;
  door: string;
  schedule: Schedule;
  confirmationPicks: string[];
  roles: ReturnType<typeof rolesOf>;
  summary: ReturnType<typeof summary>[];
  evidence: ReturnType<typeof compactEvidence>[];
  search: { file: string; sha256: string };
  compute: Lab['compute'];
  codeDigest: string;
  minutes: number;
  peaks: Lab['peaks'];
  finished: string;
}

// The cutoff's screens: every eligible ETF in alphabetical order, `concurrency` jobs at a time (each its own worker pool
// of env.workers; independent archives). A stop request lets every open job close, then exits 75; a failure stops the
// runner after the open jobs settle (no further job starts).
export const runScreens = async (cutKey: string, env: Env, concurrency: number) => {
  studyGuards(env);
  if (env.schedule === 'study')
    for (const later of Object.values(cutoffs).filter((c) => c.key > cutKey && c.key.startsWith('C')))
      if (fs.existsSync(selectionFile(env, later.key)))
        throw new Error(`the ${later.key} selection exists: ${cutKey}'s screen would follow it`);

  const queue = symbolsOf(env).filter((s) => !fs.existsSync(qualifyFile(env, cutKey, s)));
  let failure: unknown = null;
  let stopped: JobStopped | null = null;

  log(`screens ${cutKey}: ${queue.length} ETF job(s) to run, ${concurrency} at a time`);

  const worker = async () => {
    for (;;) {
      if (failure || stopped) return;

      const sym = queue.shift();

      if (!sym) return;
      try {
        await runScreenJob(cutKey, sym, env);
      } catch (error) {
        if (error instanceof JobStopped) stopped = error;
        else failure ??= error;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  if (failure) throw failure;
  if (stopped) throw stopped;
  log(`screens ${cutKey}: complete`);
};

// ----- the cutoff selection (the whole eligible universe; frozen) -----

export interface PerEtf {
  sym: string;
  control: boolean;
  qualified: number;
  confirmed: number;
  roles: ReturnType<typeof rolesOf>['roles'];
  primary: ReturnType<typeof summary> | null; // the ETF's own actual-profit holder (its fold primary)
}

export const loadScreens = (env: Env, cutKey: string) =>
  symbolsOf(env).map((s) => {
    const f = qualifyFile(env, cutKey, s);

    if (!isSealed(f)) throw new Error(`the ${cutKey} screen of ${s} is not sealed`);
    return { file: f, record: readJson<ScreenRecord>(f) };
  });

// The procedure's selection at a cutoff (frozen): the ETF AND phenotype of the universe's actual-profit role among every
// eligible ETF's qualified independent members (controls included: equal treatment); the "new ETFs" procedure (controls
// excluded; report-only, secondary); each ETF's own fold primary (its actual-profit holder) for the ETF-specific
// chronological record. No qualified member → no primary → cash (the documented fallback).
export const selectionOfScreens = (screens: { record: ScreenRecord }[]) => {
  const evidence = screens.flatMap((s) => s.record.evidence as unknown as Evidence[]);
  const universe = rolesOf('the eligible universe (every ETF’s independent members; controls included)', evidence);
  const fresh = rolesOf(
    'new ETFs only (controls VGT and GDX excluded; report-only procedure)',
    evidence.filter((e) => !isControl(e.sym))
  );
  const perEtf: PerEtf[] = screens.map(({ record: r }) => {
    const top = r.roles.roles['actual-profit'];

    return {
      sym: r.sym,
      control: r.control,
      qualified: r.roles.qualified,
      confirmed: r.evidence.filter((e) => e.confirmed).length,
      roles: r.roles.roles,
      primary: top ? r.summary.find((x) => x.label === top)! : null
    };
  });

  return { universe, new: fresh, perEtf };
};

export const runSelect = async (cutKey: string, env: Env) => {
  const file = selectionFile(env, cutKey);

  if (finalCutoff(cutKey) && env.schedule === 'study') throw new Error('the final cutoff is selected by final.ts');
  studyGuards(env);
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the ${cutKey} selection is sealed`);

  const screens = loadScreens(env, cutKey);
  const sel = selectionOfScreens(screens);
  const primary = sel.universe.roles['actual-profit'];
  const primaryNew = sel.new.roles['actual-profit'];
  const pe = (label: string | null) =>
    label ? (screens.flatMap((s) => s.record.summary).find((x) => x.label === label) ?? null) : null;
  const record = {
    stage: 'selection',
    cutoff: cutKey,
    schedule: env.schedule,
    primary,
    primarySym: pe(primary)?.sym ?? null,
    primarySummary: pe(primary),
    primaryNew,
    primaryNewSym: pe(primaryNew)?.sym ?? null,
    fallback: primary ? null : 'no qualified member in the eligible universe: cash in the next slice',
    universe: sel.universe,
    new: sel.new,
    perEtf: sel.perEtf,
    configs: Object.fromEntries(
      screens.flatMap((s) =>
        s.record.evidence.filter((e) => e.qualified).map((e) => [e.label, { sym: e.sym, id: e.id, g: e.g as GConfig }])
      )
    ),
    controls: [...controls],
    sources: screens.map((s) => ({ file: path.relative(repoRoot, s.file), sha256: sha256File(s.file) })),
    finished: new Date().toISOString()
  };

  seal(env, file, record, `selection ${cutKey}`);
  log(`selection ${cutKey}: primary ${primary ?? 'none (cash)'}; new-ETF primary ${primaryNew ?? 'none'}`);
  return record;
};
