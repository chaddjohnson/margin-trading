// The study's stages (PROTOCOL.md §9–§12), each sealed once and refusing a rerun:
//   V  verification gates (D24, D23): L0 parity, invariance, no-guess equivalence, shortened-prefix causality,
//      accounting, single-book identities, lifecycle-engine book parity — every dependent stage needs V sealed and passed;
//   C  development centres: every subject under L0, L1, L2 (detail), VG #2 native bridge, first divergences, episodes;
//   N  matched development neighbourhoods of the core matrix (Priority 3's instrument; L0 from its archives);
//   S  the standalone family-level instrument (three books alone);
//   P  the development verdicts (the frozen interpretation rules applied to C, N, S) — sealed before FULL opens;
//   F  FULL centres (2016-01-04 → 2026-10-30, boundary 2024-12-31), behind the committed FULL manifest.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { type BookId, runGrowthBook } from '../vg-d1-growth-joint/books.ts';
import { type Rec, evalKey } from '../vg-d1-growth-joint/evaluate.ts';
import { evaluationFiles } from '../vg-d1-growth-joint/lab.ts';
import { nbStats } from '../vg-d1-growth-joint/fitness.ts';
import { Archive } from '../vg-d1-growth-diagnostic/archive.ts';
import { archivePins, checkP3 } from '../vg-d1-growth-diagnostic/stages.ts';
import { tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
import {
  STUDY,
  ceilings,
  economics,
  freezeFile,
  fullManifestFile,
  log,
  manifestFile,
  r2,
  repoRoot,
  researchDir,
  resultsDir,
  windows
} from './context.ts';
import { openStudyDoor } from './doors.ts';
import type { Output } from './evaluate.ts';
import { lifeBookOf } from './growthBook.ts';
import { type Draw, type FamilyName, coreDraws, familyNames, standaloneDraws } from './instruments.ts';
import { type Result, type Task, jobCounts, runJob } from './jobs.ts';
import type { Mode } from './lifecycle.ts';
import { isSealed, plain, readJson, rel, sealJson, sha256File, verifySeals } from './records.ts';
import { type Subject, loadSubjects, nativeOptions } from './subjects.ts';

// ----- integrity -----

const filesOf = (dir: string) =>
  fs
    .readdirSync(path.join(repoRoot, dir))
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => path.join(dir, f));

export const studyFiles = () => [
  ...filesOf(path.join('src', STUDY)),
  ...filesOf('src/vg-d1-growth-diagnostic'), // reused read-only (subjects, archive reader, instrument rows, tails)
  'src/growth140-vgt-s8m/checkpoint.ts',
  'src/growth140-vgt-s8m/store.ts'
];

// This study's code digest: Priority 3's evaluation files (unchanged; its closure digest is checked separately), the
// reused 3A modules and this study's own modules.
export const codeDigest = () =>
  createHash('sha256')
    .update(
      [...new Set([...evaluationFiles, ...studyFiles()])]
        .map((f) => `${f}:${sha256File(path.join(repoRoot, f))}`)
        .join('\n')
    )
    .digest('hex');

export const acknowledgementsFile = path.join(resultsDir, 'code-acknowledgements.jsonl');

const acknowledged = () => {
  if (!fs.existsSync(acknowledgementsFile)) return [] as string[];

  const amendments = fs.readFileSync(path.join(researchDir, 'AMENDMENTS.md'), 'utf8');

  return fs
    .readFileSync(acknowledgementsFile, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { digest: string; amendment: string })
    .filter((a) => amendments.includes(`### ${a.amendment} `))
    .map((a) => a.digest);
};

const committed = (file: string) =>
  execSync(`git ls-files -- ${rel(file)}`, { cwd: repoRoot })
    .toString()
    .trim() === rel(file) &&
  !execSync(`git status --porcelain -- ${rel(file)}`, { cwd: repoRoot })
    .toString()
    .trim();

interface Freeze {
  protocolSha256: string;
  manifestSha256: string;
  codeDigest: string;
  archives: Record<string, string>;
}

export const guards = (o: { archives?: boolean } = {}) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (!isSealed(freezeFile) || !committed(freezeFile))
    throw new Error('the protocol is not frozen and committed (results/protocol-freeze.json)');

  const f = readJson<Freeze>(freezeFile);

  if (sha256File(path.join(researchDir, 'PROTOCOL.md')) !== f.protocolSha256) throw new Error('PROTOCOL.md changed');
  if (sha256File(manifestFile) !== f.manifestSha256) throw new Error('STUDY_MANIFEST.json changed');

  const digest = codeDigest();

  if (digest !== f.codeDigest && !acknowledged().includes(digest))
    throw new Error(`the code changed after the freeze without an acknowledged amendment (${digest})`);
  checkP3();
  if (o.archives)
    for (const [job, sha] of Object.entries(f.archives))
      if (sha256File(path.join(repoRoot, '.cache', 'vg-d1-growth-joint', 'jobs', job, 'archive.sqlite')) !== sha)
        throw new Error(`Priority 3's archive ${job} changed`);
  return { freeze: f, digest };
};

// ----- records and ceilings -----

export const stageFiles = {
  V: path.join(resultsDir, 'verification', 'verification.json'),
  C: path.join(resultsDir, 'development', 'centres.json'),
  N: path.join(resultsDir, 'development', 'neighbourhoods.json'),
  S: path.join(resultsDir, 'development', 'standalone.json'),
  P: path.join(resultsDir, 'development', 'verdicts.json'),
  F: path.join(resultsDir, 'full', 'full.json')
};

export interface Counts {
  development: number;
  full: number;
  retries: number;
  rounds: number;
  growthSims: number;
  archiveReads: number;
  bookRuns: number;
}

const zero = (): Counts => ({
  development: 0,
  full: 0,
  retries: 0,
  rounds: 0,
  growthSims: 0,
  archiveReads: 0,
  bookRuns: 0
});

export const usedSoFar = (): Counts => {
  const sum = zero();

  for (const f of Object.values(stageFiles))
    if (fs.existsSync(f)) {
      const c = readJson<{ counts: Counts }>(f).counts;

      for (const k of Object.keys(sum) as (keyof Counts)[]) sum[k] += c[k] ?? 0;
    }
  return sum;
};

const checkCeilings = (plan: { development: number; full: number }) => {
  const u = usedSoFar();

  if (u.development + plan.development > ceilings.development)
    throw new Error(
      `development ceiling: ${u.development} used + ${plan.development} planned > ${ceilings.development}`
    );
  if (u.full + plan.full > ceilings.full) throw new Error(`full ceiling: ${u.full} + ${plan.full} > ${ceilings.full}`);
};

const refuseRerun = (stage: keyof typeof stageFiles) => {
  if (fs.existsSync(stageFiles[stage])) throw new Error(`stage ${stage} is sealed: it never reruns`);
};

const requireSealed = (...stages: (keyof typeof stageFiles)[]) => {
  for (const s of stages) if (!isSealed(stageFiles[s])) throw new Error(`stage ${s} must be sealed first`);

  const v = verifySeals();

  if (v.failed.length) throw new Error(`sealed records changed: ${v.failed.join(', ')}`);
};

const countsOf = (results: Map<string, Result>, jobs: string[], door: 'development' | 'full'): Counts => {
  const c = zero();

  c[door] = results.size;
  for (const r of results.values()) {
    c.rounds += r.out.summary.rounds;
    c.growthSims += r.out.summary.growthSims;
  }
  for (const j of jobs) c.retries += jobCounts(j).retries;
  return c;
};

const add = (a: Counts, b: Counts): Counts =>
  Object.fromEntries(Object.keys(a).map((k) => [k, a[k as keyof Counts] + b[k as keyof Counts]])) as unknown as Counts;

// ----- helpers -----

const compareEncoded = (a: unknown, b: unknown, skip: string[] = []) => {
  const pa = plain(a) as Record<string, unknown>;
  const pb = plain(b) as Record<string, unknown>;

  for (const k of skip) {
    delete pa[k];
    delete pb[k];
  }
  return JSON.stringify(pa) === JSON.stringify(pb);
};

const growthOn = (s: Subject) => s.enabled.some((b) => b.startsWith('G:'));
const task = (
  id: string,
  door: Task['door'],
  s: Pick<Subject, 'quad' | 'options'>,
  mode: Mode,
  extra: Partial<Task> = {}
): Task => ({
  id,
  door,
  quad: s.quad,
  options: s.options,
  mode,
  ...extra
});

// The compact form of one neighbourhood draw (paired comparisons and participation).
export const compactOf = (d: Draw, out: Output) => ({
  id: d.id,
  family: d.family,
  rep: d.rep,
  row: d.row,
  clipped: d.clipped,
  net: out.rec.net,
  dd: out.rec.dd,
  signature: out.rec.signature,
  lots: out.rec.lots,
  d1Booked: out.rec.fam.D1.booked,
  gBooked: out.rec.fam.G.booked,
  idle: out.summary.pool.idle,
  growth: Object.fromEntries(
    Object.entries(out.summary.books).map(([b, x]) => [
      b,
      {
        lots: x!.lots,
        booked: x!.booked,
        records: x!.records,
        refused: x!.refused,
        waiting: x!.waiting,
        virtualIdle: x!.virtualHolds.idleCloses
      }
    ])
  )
});

// Lots in entry order, compared by book, entry instant and exits (the funded ledger).
type LedgerRow = NonNullable<Output['detail']>['ledger'][number];

const lotKey = (l: LedgerRow) =>
  `${l.book}@${l.entry}>${l.exits.map((e) => `${e.t}${e.partial ? 'p' : ''}`).join('/')}${l.open ? '+open' : ''}`;

export const divergenceOf = (ref: LedgerRow[], x: LedgerRow[]) => {
  const n = Math.min(ref.length, x.length);
  let i = 0;

  while (i < n && lotKey(ref[i]!) === lotKey(x[i]!)) i++;
  if (i === ref.length && i === x.length) return { identical: true as const };

  const a = ref[i];
  const b = x[i];
  const refKeys = new Set(ref.map((l) => `${l.book}@${l.entry}`));
  const xKeys = new Set(x.map((l) => `${l.book}@${l.entry}`));

  return {
    identical: false as const,
    index: i,
    reference: a ? { book: a.book, kind: a.kind, entry: a.entry, exit: a.exits.at(-1)?.t ?? null, net: a.net } : null,
    changed: b ? { book: b.book, kind: b.kind, entry: b.entry, exit: b.exits.at(-1)?.t ?? null, net: b.net } : null,
    kind:
      a && b && a.book === b.book && a.entry === b.entry
        ? 'changed exit'
        : b && !refKeys.has(`${b.book}@${b.entry}`)
          ? 'admitted (a lot L0 did not fund)'
          : 'displaced (an L0 lot not funded here)',
    displaced: ref
      .slice(i)
      .filter((l) => !xKeys.has(`${l.book}@${l.entry}`))
      .map((l) => ({ book: l.book, kind: l.kind, entry: l.entry, net: l.net })),
    admitted: x
      .slice(i)
      .filter((l) => !refKeys.has(`${l.book}@${l.entry}`))
      .map((l) => ({ book: l.book, kind: l.kind, entry: l.entry, net: l.net })),
    afterReference: r2(ref.slice(i).reduce((s, l) => s + l.net, 0)),
    afterChanged: r2(x.slice(i).reduce((s, l) => s + l.net, 0))
  };
};

const accountingOf = (key: string, out: Output) => {
  const errors: string[] = [];
  const ledger = out.detail?.ledger ?? [];
  const sum = ledger.reduce((s, l) => s + l.net, 0);

  if (out.detail && Math.abs(sum - out.rec.net) > 0.005 * (ledger.length + 1))
    errors.push(`${key}: Σ lots ${r2(sum)} ≠ net ${out.rec.net}`);
  if (out.rec.peakPrincipal > economics.budget + 1e-6)
    errors.push(`${key}: principal ${out.rec.peakPrincipal} > budget`);
  for (let i = 1; i < ledger.length; i++) {
    const prev = ledger[i - 1]!;

    if (prev.open || (prev.exits.at(-1)?.t ?? '') > (ledger[i]!.entry ?? ''))
      errors.push(`${key}: lots ${prev.lot} and ${ledger[i]!.lot} overlap (one funded slot)`);
  }
  return errors;
};

// ----- stage V: verification gates -----

export const verificationTasks = (subjects: Subject[]) => {
  const core = subjects.filter((s) => s.group === 'core');
  const coreG = core.filter(growthOn);
  const D = core.find((s) => s.key === 'D')!;
  const standalone = subjects.filter((s) => s.group === 'standalone');
  const d24: Task[] = [];
  const d23: Task[] = [];

  for (const s of subjects) d24.push(task(`V1|${s.key}|L0`, 'D24', s, 'L0', { detail: true }));
  for (const s of core.filter((x) => x.p3Key))
    for (const d of coreDraws(s, 'confirm').slice(0, 16))
      d24.push(task(`V2|${s.key}|${d.id}`, 'D24', { quad: d.quad, options: s.options }, 'L0'));
  for (const mode of ['L1', 'L2'] as const) {
    d24.push(task(`V3|D|centre|${mode}`, 'D24', D, mode));
    for (const d of coreDraws(D, 'confirm').slice(0, 16))
      d24.push(task(`V3|D|${d.id}|${mode}`, 'D24', { quad: d.quad, options: D.options }, mode));
  }
  for (const s of standalone)
    for (const mode of ['L0', 'L1', 'L2'] as const) {
      if (mode !== 'L0') d24.push(task(`V3|${s.key}|centre|${mode}`, 'D24', s, mode));
      for (const d of standaloneDraws(s, 'confirm').slice(0, 8))
        d24.push(task(`V3|${s.key}|${d.id}|${mode}`, 'D24', { quad: d.quad, options: s.options }, mode));
    }
  for (const s of coreG)
    for (const mode of ['L1', 'L2'] as const) {
      d24.push(task(`V4|${s.key}|${mode}|guess`, 'D24', s, mode, { detail: true }));
      d24.push(task(`V4|${s.key}|${mode}|noguess`, 'D24', s, mode, { detail: true, noGuess: true }));
      d23.push(task(`V5|${s.key}|${mode}`, 'D23', s, mode, { detail: true }));
    }

  return { d24, d23 };
};

export const stageV = async () => {
  const { digest } = guards({ archives: true });

  refuseRerun('V');

  const subjects = loadSubjects();
  const byKey = new Map(subjects.map((s) => [s.key, s]));
  const { d24, d23 } = verificationTasks(subjects);

  checkCeilings({ development: d24.length + d23.length, full: 0 });

  const r24 = await runJob('V-D24', 'D24', d24, { codeDigest: digest });
  const r23 = await runJob('V-D23', 'D23', d23, { codeDigest: digest });
  const out = (id: string) => {
    const r = r24.get(id) ?? r23.get(id);

    if (!r) throw new Error(`missing ${id}`);
    return r.out;
  };
  const failures: string[] = [];
  const checks: Record<string, unknown> = {};

  // V1: L0 parity of every centre with Priority 3's sealed record; E with A's sealed causal removal record
  const v1: Record<string, string> = {};
  const A = byKey.get('A')!;
  const removal = (A.evidence as { removal: Record<string, Rec> }).removal['without G:VGT']!;

  for (const s of subjects) {
    const o = out(`V1|${s.key}|L0`);

    if (s.sealedCentre) v1[s.key] = compareEncoded(o.rec, s.sealedCentre) ? 'equal to the sealed centre' : 'DIFFERS';
    else if (s.key === 'E')
      v1[s.key] = compareEncoded(o.rec, removal, ['id'])
        ? "equal to A's sealed removal record 'without G:VGT' (all fields but the id)"
        : 'DIFFERS';
    else {
      // a single Growth book alone: the pooled run equals the book's canonical standalone run
      const b = s.enabled[0]!;
      const v = o.rec.virtual[b]!;

      v1[s.key] =
        v.net === o.rec.net && v.dd === o.rec.dd
          ? 'pooled = canonical standalone (net and minute DD)'
          : `DIFFERS (${v.net}/${v.dd} vs ${o.rec.net}/${o.rec.dd})`;
    }
    if (v1[s.key]!.startsWith('DIFFERS')) failures.push(`V1 ${s.key}: ${v1[s.key]}`);
    failures.push(...accountingOf(`V1 ${s.key}`, o));
  }
  checks.V1 = v1;

  // V2: archived Priority 3 draws reproduced field for field
  const v2: Record<string, { replayed: number; equal: number }> = {};

  for (const s of subjects.filter((x) => x.group === 'core' && x.p3Key)) {
    const arc = new Archive(s.need === 'G' ? 'qualify-gpair-C24' : 'qualify-C24');
    const x = { replayed: 0, equal: 0 };

    for (const d of coreDraws(s, 'confirm').slice(0, 16)) {
      const archived = arc.point(evalKey('D24', d.quad, s.options));

      x.replayed++;
      if (archived && compareEncoded(out(`V2|${s.key}|${d.id}`).rec, archived)) x.equal++;
      else failures.push(`V2 ${s.key} ${d.id}: ${archived ? 'differs' : 'not archived'}`);
    }
    v2[s.key] = x;
  }
  checks.V2 = v2;

  // V3: invariance — D (no Growth) and the standalone books (never refused) are identical under L0, L1 and L2
  const v3: Record<string, string> = {};
  const D = byKey.get('D')!;
  const same = (a: Output, b: Output) => compareEncoded(a.rec, b.rec) && compareEncoded(a.summary.pool, b.summary.pool);

  for (const mode of ['L1', 'L2'] as const) {
    const ok = [same(out(`V3|D|centre|${mode}`), out('V1|D|L0'))];

    for (const d of coreDraws(D, 'confirm').slice(0, 16)) {
      const arc = new Archive('qualify-C24').point(evalKey('D24', d.quad, D.options));

      ok.push(Boolean(arc) && compareEncoded(out(`V3|D|${d.id}|${mode}`).rec, arc));
    }
    v3[`D ${mode}`] = ok.every(Boolean) ? `identical to L0 (centre + ${ok.length - 1} draws)` : 'DIFFERS';
  }
  for (const s of subjects.filter((x) => x.group === 'standalone'))
    for (const mode of ['L1', 'L2'] as const) {
      const ok = [same(out(`V3|${s.key}|centre|${mode}`), out(`V1|${s.key}|L0`))];

      for (const d of standaloneDraws(s, 'confirm').slice(0, 8)) {
        const a = out(`V3|${s.key}|${d.id}|${mode}`);
        const z = out(`V3|${s.key}|${d.id}|L0`);
        const b = s.enabled[0]!;

        ok.push(same(a, z) && a.rec.virtual[b]!.net === a.rec.net && (a.summary.books[b]?.refused ?? 0) === 0);
      }
      v3[`${s.key} ${mode}`] = ok.every(Boolean)
        ? `identical to L0, never refused (centre + ${ok.length - 1} draws)`
        : 'DIFFERS';
    }
  for (const [k, v] of Object.entries(v3)) if (v === 'DIFFERS') failures.push(`V3 ${k}`);
  checks.V3 = v3;

  // V4: the fixed point does not depend on the guess; V5: decisions on the shortened door D23 equal D24's up to its end
  const v4: Record<string, unknown> = {};
  const v5: Record<string, unknown> = {};
  const cutoff = `${windows.prefixDoor === 'D23' ? '2023-12-29' : ''}T23:59`;

  for (const s of subjects.filter((x) => x.group === 'core' && growthOn(x)))
    for (const mode of ['L1', 'L2'] as const) {
      const g = out(`V4|${s.key}|${mode}|guess`);
      const n = out(`V4|${s.key}|${mode}|noguess`);
      const eq =
        compareEncoded(g.rec, n.rec) &&
        compareEncoded(g.detail, n.detail) &&
        compareEncoded(g.summary.books, n.summary.books);

      v4[`${s.key} ${mode}`] = { equal: eq, rounds: [g.summary.rounds, n.summary.rounds] };
      if (!eq) failures.push(`V4 ${s.key} ${mode}: the no-guess fixed point differs`);
      failures.push(...accountingOf(`V4 ${s.key} ${mode}`, g));

      const p = out(`V5|${s.key}|${mode}`);
      const before = <T extends { t: string | null }>(xs: T[]) => xs.filter((x) => (x.t ?? '') <= cutoff);
      const fundEq = JSON.stringify(before(p.detail!.funding)) === JSON.stringify(before(g.detail!.funding));
      const reqEq = Object.keys(g.detail!.requests).every(
        (b) =>
          JSON.stringify(before(p.detail!.requests[b as BookId]!)) ===
          JSON.stringify(before(g.detail!.requests[b as BookId]!))
      );
      const lots = (o: Output) =>
        o
          .detail!.ledger.filter((l) => (l.entry ?? '') <= cutoff)
          .map(
            (l) =>
              `${l.book}@${l.entry}:${l.entryRaw}>${l.exits
                .filter((e) => (e.t ?? '') <= cutoff)
                .map((e) => `${e.t}:${e.raw}`)
                .join('/')}`
          );
      const lotEq = JSON.stringify(lots(p)) === JSON.stringify(lots(g));

      v5[`${s.key} ${mode}`] = { funding: fundEq, requests: reqEq, lots: lotEq };
      if (!(fundEq && reqEq && lotEq)) failures.push(`V5 ${s.key} ${mode}: D23 ≠ D24 before the cutoff`);
    }
  checks.V4 = v4;
  checks.V5 = v5;

  // V6: the lifecycle engine in L0 mode reproduces the canonical Growth book of every distinct Growth configuration
  const door = await openStudyDoor('D24', 'stage V: lifecycle-engine L0 book parity');
  const v6: Record<string, boolean> = {};
  let bookRuns = 0;

  for (const s of subjects)
    for (const b of s.enabled.filter((x) => x.startsWith('G:'))) {
      const sym = b.slice(2) as 'GDX' | 'VGT';
      const key = `${sym}:${s.growth[sym]!.id}`;

      if (key in v6) continue;

      const a = runGrowthBook(door.sym[sym], door, s.quad.g[sym]);
      const l = lifeBookOf(door.sym[sym], door, s.quad.g[sym], 'L0', () => true);

      bookRuns += 2;
      v6[key] = compareEncoded(a.trades, l.trades) && compareEncoded(a.standalone, l.standalone);
      if (!v6[key]) failures.push(`V6 ${key}: the L0 lifecycle book differs from runGrowthBook`);
    }
  checks.V6 = v6;

  const counts = add(countsOf(r24, ['V-D24'], 'development'), countsOf(r23, ['V-D23'], 'development'));

  counts.development = r24.size + r23.size;
  counts.bookRuns = bookRuns;

  const passed = failures.length === 0;
  const sha = sealJson(
    stageFiles.V,
    {
      stage: 'V',
      passed,
      failures,
      checks,
      counts,
      codeDigest: digest,
      outputs: {
        centresL0: Object.fromEntries(subjects.map((s) => [s.key, out(`V1|${s.key}|L0`).rec]))
      }
    },
    'V verification'
  );

  log(`stage V sealed ${sha.slice(0, 12)} — ${passed ? 'PASSED' : `FAILED (${failures.length})`}`);
  if (!passed) {
    for (const f of failures.slice(0, 40)) log(`  ${f}`);
    process.exitCode = 2;
  }
};

const requireV = () => {
  requireSealed('V');
  if (!readJson<{ passed: boolean }>(stageFiles.V).passed)
    throw new Error('stage V failed: every dependent stage stops');
};

// ----- stage C: development centres -----

export const episodes = [
  {
    subject: 'GP85',
    book: 'G:VGT',
    date: '2016-07-06',
    note: 'refused behind a G·GDX lot released 2016-07-20; virtual hold → 2018-10-12, 563 idle closes (3A)'
  },
  {
    subject: 'GP85',
    book: 'G:VGT',
    date: '2020-04-13',
    note: 'refused behind a G·GDX lot released 2020-04-15; virtual hold → 2022-01-20, 400 idle closes (3A)'
  },
  {
    subject: 'GP4',
    book: 'G:VGT',
    date: '2016-06-28',
    note: 'refused behind a G·GDX lot released 2016-07-20; virtual hold → 2018-02-05, 389 idle closes (3A)'
  },
  {
    subject: 'B',
    book: 'G:VGT',
    date: '2020-04-13',
    note: 'refused behind a D1·GDX lot released 2020-04-15; virtual hold → 2022-01-20, 210 idle closes (3A)'
  }
] as const;

export const stageC = async () => {
  const { digest } = guards();

  requireV();
  refuseRerun('C');

  const subjects = loadSubjects();
  const D = subjects.find((s) => s.key === 'D')!;
  const tasks: Task[] = [];

  for (const s of subjects)
    for (const mode of ['L0', 'L1', 'L2'] as const)
      tasks.push(task(`C|${s.key}|${mode}`, 'D24', s, mode, { detail: true }));
  tasks.push(task('C|D|native', 'D24', { quad: D.quad, options: nativeOptions(D) }, 'L0', { detail: true }));
  checkCeilings({ development: tasks.length, full: 0 });

  const res = await runJob('C-D24', 'D24', tasks, { codeDigest: digest });
  const out = (k: string, m: string) => res.get(`C|${k}|${m}`)!.out;
  const centres: Record<string, unknown> = {};

  for (const s of subjects) {
    const l0 = out(s.key, 'L0');

    centres[s.key] = {
      key: s.key,
      label: s.label,
      group: s.group,
      id: s.id,
      enabled: s.enabled,
      growth: s.growth,
      modes: Object.fromEntries(
        (['L0', 'L1', 'L2'] as const).map((m) => {
          const o = out(s.key, m);

          return [
            m,
            {
              rec: o.rec,
              summary: o.summary,
              detail: o.detail,
              divergence: m === 'L0' ? null : divergenceOf(l0.detail!.ledger, o.detail!.ledger),
              delta: m === 'L0' ? null : { net: r2(o.rec.net - l0.rec.net), dd: r2(o.rec.dd - l0.rec.dd) }
            }
          ];
        })
      )
    };
  }

  const native = res.get('C|D|native')!.out;
  const sha = sealJson(
    stageFiles.C,
    {
      stage: 'C',
      door: 'D24',
      codeDigest: digest,
      native: {
        rec: native.rec,
        summary: native.summary,
        refusals: native.rec.books['D1:GDX'].refused + native.rec.books['D1:VGT'].refused
      },
      episodes,
      centres,
      counts: countsOf(res, ['C-D24'], 'development')
    },
    'C development centres'
  );

  log(`stage C sealed ${sha.slice(0, 12)}`);
};

// ----- stage N: matched neighbourhoods of the core matrix -----

export const nbSubjects = ['E', 'C4', 'C85', 'A', 'B', 'GP4', 'GP85', 'V4', 'V85'] as const;

export const neighbourhoodPlan = (subjects: Subject[]) => {
  const tasks: Task[] = [];
  const archived: { s: Subject; family: FamilyName; d: Draw }[] = [];

  for (const k of nbSubjects) {
    const s = subjects.find((x) => x.key === k)!;

    for (const family of familyNames)
      for (const d of coreDraws(s, family)) {
        for (const mode of ['L1', 'L2'] as const)
          tasks.push(task(`N|${k}|${family}|${d.id}|${mode}`, 'D24', { quad: d.quad, options: s.options }, mode));
        if (!s.p3Key)
          tasks.push(task(`N|${k}|${family}|${d.id}|L0`, 'D24', { quad: d.quad, options: s.options }, 'L0'));
        else archived.push({ s, family, d });
      }
  }
  return { tasks, archived };
};

const pairedOf = (
  ref: { id: string; net: number; dd: number; signature: string }[],
  x: { id: string; net: number; dd: number; signature: string }[]
) => {
  const byId = new Map(ref.map((d) => [d.id, d]));
  const dn = x.map((d) => d.net - byId.get(d.id)!.net).sort((a, b) => a - b);
  const dd = x.map((d) => d.dd - byId.get(d.id)!.dd).sort((a, b) => a - b);
  const q = (a: number[], p: number) => {
    const pos = (a.length - 1) * p;

    return r2(a[Math.floor(pos)]! + (a[Math.ceil(pos)]! - a[Math.floor(pos)]!) * (pos - Math.floor(pos)));
  };

  return {
    n: x.length,
    net: {
      median: q(dn, 0.5),
      p10: q(dn, 0.1),
      p90: q(dn, 0.9),
      mean: r2(dn.reduce((a, b) => a + b, 0) / dn.length),
      better: dn.filter((v) => v > 0.005).length,
      worse: dn.filter((v) => v < -0.005).length
    },
    dd: {
      median: q(dd, 0.5),
      p10: q(dd, 0.1),
      p90: q(dd, 0.9),
      higher: dd.filter((v) => v > 0.005).length,
      lower: dd.filter((v) => v < -0.005).length
    },
    sameLedger: x.filter((d) => byId.get(d.id)!.signature === d.signature).length
  };
};

export const stageN = async () => {
  const { digest } = guards({ archives: true });

  requireV();
  requireSealed('C');
  refuseRerun('N');

  const subjects = loadSubjects();
  const { tasks, archived } = neighbourhoodPlan(subjects);
  const arcs = { 'qualify-C24': new Archive('qualify-C24'), 'qualify-gpair-C24': new Archive('qualify-gpair-C24') };
  const fromArchive = new Map<string, Rec>();
  const missing: string[] = [];

  for (const a of archived) {
    const r = arcs[a.s.need === 'G' ? 'qualify-gpair-C24' : 'qualify-C24'].point(evalKey('D24', a.d.quad, a.s.options));

    if (r) fromArchive.set(`N|${a.s.key}|${a.family}|${a.d.id}|L0`, r);
    else {
      missing.push(`${a.s.key}|${a.family}|${a.d.id}`);
      tasks.push(task(`N|${a.s.key}|${a.family}|${a.d.id}|L0`, 'D24', { quad: a.d.quad, options: a.s.options }, 'L0'));
    }
  }

  checkCeilings({ development: tasks.length, full: 0 });

  const res = await runJob('N-D24', 'D24', tasks, { codeDigest: digest });
  const C = readJson<{ centres: Record<string, { modes: Record<Mode, { rec: Rec }> }> }>(stageFiles.C);
  const out: Record<string, unknown> = {};

  for (const k of nbSubjects) {
    const s = subjects.find((x) => x.key === k)!;
    const perFamily: Record<string, unknown> = {};

    for (const family of familyNames) {
      const draws = coreDraws(s, family);
      const modes: Record<string, unknown> = {};
      const compact: Record<string, ReturnType<typeof compactOf>[]> = {};

      for (const mode of ['L0', 'L1', 'L2'] as const) {
        const recs = draws.map((d) => {
          const id = `N|${k}|${family}|${d.id}|${mode}`;
          const r = res.get(id);

          if (r) return { d, rec: r.out.rec, out: r.out };

          const a = fromArchive.get(id);

          if (!a) throw new Error(`missing ${id}`);
          return { d, rec: a, out: null };
        });
        const centre = C.centres[k]!.modes[mode].rec;

        compact[mode] = recs.map((x) =>
          x.out
            ? compactOf(x.d, x.out)
            : {
                id: x.d.id,
                family,
                rep: x.d.rep,
                row: x.d.row,
                clipped: x.d.clipped,
                net: x.rec.net,
                dd: x.rec.dd,
                signature: x.rec.signature,
                lots: x.rec.lots,
                d1Booked: x.rec.fam.D1.booked,
                gBooked: x.rec.fam.G.booked,
                idle: NaN,
                growth: Object.fromEntries(
                  Object.entries(x.rec.books)
                    .filter(([b]) => b.startsWith('G:') && s.enabled.includes(b as BookId))
                    .map(([b, v]) => [
                      b,
                      {
                        lots: v.lots,
                        booked: v.booked,
                        records: v.decisions,
                        refused: v.refused,
                        waiting: 0,
                        virtualIdle: NaN
                      }
                    ])
                )
              }
        );
        modes[mode] = {
          nb: nbStats(
            centre,
            recs.map((x) => x.rec),
            recs.map((x) => x.d.clipped)
          ),
          tail: tailOf(
            centre,
            recs.map((x) => ({ rec: x.rec, clipped: x.d.clipped }))
          ),
          source:
            mode === 'L0' && s.p3Key
              ? `Priority 3 archive (${s.need === 'G' ? 'qualify-gpair-C24' : 'qualify-C24'})`
              : 'fresh'
        };
      }

      // the sealed Priority 3 statistics must be reproduced by the archived L0 draws
      const sealed = s.p3Key ? (s.evidence as Record<string, unknown>)[family] : null;
      const l0nb = (modes.L0 as { nb: unknown }).nb;

      perFamily[family] = {
        n: draws.length,
        modes,
        sealedL0: sealed ?? null,
        sealedReproduced: sealed ? compareEncoded(l0nb, sealed) : null,
        paired: {
          L1vsL0: pairedOf(compact.L0!, compact.L1!),
          L2vsL0: pairedOf(compact.L0!, compact.L2!),
          L2vsL1: pairedOf(compact.L1!, compact.L2!)
        },
        draws: compact
      };
    }
    out[k] = { key: k, id: s.id, need: s.need, families: perFamily };
  }

  const counts = countsOf(res, ['N-D24'], 'development');

  counts.archiveReads = archived.length;

  const sha = sealJson(
    stageFiles.N,
    { stage: 'N', door: 'D24', codeDigest: digest, missingFromArchive: missing, subjects: out, counts },
    'N neighbourhoods'
  );

  log(`stage N sealed ${sha.slice(0, 12)} (${res.size} fresh, ${archived.length - missing.length} archived)`);
};

// ----- stage S: the standalone family-level instrument -----

export const standalonePlan = (subjects: Subject[]) => {
  const tasks: Task[] = [];

  for (const s of subjects.filter((x) => x.group === 'standalone'))
    for (const family of familyNames)
      for (const d of standaloneDraws(s, family))
        tasks.push(task(`S|${s.key}|${family}|${d.id}`, 'D24', { quad: d.quad, options: s.options }, 'L0'));
  return tasks;
};

export const stageS = async () => {
  const { digest } = guards();

  requireV();
  requireSealed('C');
  refuseRerun('S');

  const subjects = loadSubjects();
  const tasks = standalonePlan(subjects);

  checkCeilings({ development: tasks.length, full: 0 });

  const res = await runJob('S-D24', 'D24', tasks, { codeDigest: digest });
  const C = readJson<{ centres: Record<string, { modes: Record<Mode, { rec: Rec }> }> }>(stageFiles.C);
  const out: Record<string, unknown> = {};

  for (const s of subjects.filter((x) => x.group === 'standalone')) {
    const fams: Record<string, unknown> = {};
    const centre = C.centres[s.key]!.modes.L0.rec;

    for (const family of familyNames) {
      const draws = standaloneDraws(s, family);
      const recs = draws.map((d) => ({ d, out: res.get(`S|${s.key}|${family}|${d.id}`)!.out }));

      fams[family] = {
        n: draws.length,
        nb: nbStats(
          centre,
          recs.map((x) => x.out.rec),
          recs.map((x) => x.d.clipped)
        ),
        tail: tailOf(
          centre,
          recs.map((x) => ({ rec: x.out.rec, clipped: x.d.clipped }))
        ),
        draws: recs.map((x) => compactOf(x.d, x.out))
      };
    }
    out[s.key] = { key: s.key, id: s.id, growth: s.growth, families: fams };
  }

  const sha = sealJson(
    stageFiles.S,
    { stage: 'S', door: 'D24', codeDigest: digest, subjects: out, counts: countsOf(res, ['S-D24'], 'development') },
    'S standalone'
  );

  log(`stage S sealed ${sha.slice(0, 12)}`);
};

// ----- stage F: FULL centres -----

export const fullSubjects = (subjects: Subject[]) => subjects.filter((s) => s.group !== 'finalist');

export const stageF = async () => {
  const { digest } = guards();

  requireV();
  requireSealed('C', 'N', 'S', 'P');
  refuseRerun('F');

  const m = readJson<{ subjects: string[]; modes: Mode[]; native: boolean }>(fullManifestFile);
  const subjects = loadSubjects().filter((s) => m.subjects.includes(s.key));
  const D = subjects.find((s) => s.key === 'D')!;
  const tasks: Task[] = [];

  for (const s of subjects)
    for (const mode of m.modes)
      tasks.push(task(`F|${s.key}|${mode}`, 'FULL', s, mode, { detail: true, boundary: windows.boundary }));
  if (m.native)
    tasks.push(
      task('F|D|native', 'FULL', { quad: D.quad, options: nativeOptions(D) }, 'L0', {
        detail: true,
        boundary: windows.boundary
      })
    );
  checkCeilings({ development: 0, full: tasks.length });

  const res = await runJob(
    'F-FULL',
    'FULL',
    tasks,
    { codeDigest: digest },
    { purpose: 'stage F: frozen FULL centres (validation reporting)' }
  );
  const out: Record<string, unknown> = {};

  for (const s of subjects) {
    const l0 = res.get(`F|${s.key}|L0`)!.out;

    out[s.key] = {
      key: s.key,
      modes: Object.fromEntries(
        m.modes.map((mode) => {
          const o = res.get(`F|${s.key}|${mode}`)!.out;

          return [
            mode,
            {
              rec: o.rec,
              summary: o.summary,
              detail: o.detail,
              divergence: mode === 'L0' ? null : divergenceOf(l0.detail!.ledger, o.detail!.ledger)
            }
          ];
        })
      )
    };
  }

  const native = res.get('F|D|native')?.out ?? null;
  const sha = sealJson(
    stageFiles.F,
    {
      stage: 'F',
      door: 'FULL',
      boundary: windows.boundary,
      codeDigest: digest,
      native: native ? { rec: native.rec, summary: native.summary } : null,
      subjects: out,
      counts: countsOf(res, ['F-FULL'], 'full')
    },
    'F FULL centres'
  );

  log(`stage F sealed ${sha.slice(0, 12)}`);
};

export const stageRecordSha = () =>
  Object.fromEntries(
    Object.entries(stageFiles)
      .filter(([, f]) => fs.existsSync(f))
      .map(([k, f]) => [k, sha256File(f)])
  );
export { archivePins };
