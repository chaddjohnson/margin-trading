// The diagnostic's stages (PROTOCOL.md §4–§9), each sealed once: R reproduce + participation (D24), S search and
// promotion audit (archives only), N neighbourhood reconstruction and draw replays (archives + D24), P the frozen
// probes (D24), F the retrospective replay of the frozen subjects on FULL. Every stage checks the preflight, the
// frozen protocol and code, Priority 3's pins and the ceilings first.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { chronology } from '../vg-d1-growth-joint/context.ts';
import { type Door, openFullDoor, openPrefixDoor, verifyDoorFile } from '../vg-d1-growth-joint/data.ts';
import { closureDigest, codeClosure } from '../vg-d1-growth-joint/freeze.ts';
import { codeDigest, evaluationFiles } from '../vg-d1-growth-joint/lab.ts';
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import type { LaneResult } from '../vg-d1-growth-joint/search.ts';
import { quadId } from '../vg-d1-growth-joint/space.ts';
import { Archive, auditLane, volumeOf } from './archive.ts';
import {
  STUDY,
  archiveFile,
  boundary,
  ceilings,
  codeDir,
  economics,
  freezeFile,
  log,
  manifestFile,
  p3,
  r2,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import {
  type Observed,
  ddEpisodeOf,
  divergenceOf,
  firstDifference,
  funnelOf,
  observe,
  plain,
  poolTimeOf,
  refusalsOf
} from './observer.ts';
import { isSealed, logDoor, readJson, readP3, rel, sealJson, sha256File, verifySeals } from './records.ts';
import {
  type Draw,
  archivedReader,
  associationOf,
  familiesOf,
  inputsOf,
  moveInput,
  pooledDraws,
  radiusOf,
  sealedMatches,
  tailOf
} from './risk.ts';
import { type Subject, loadSubjects, nativeOptions } from './subjects.ts';

// ----- integrity -----

export const studyFiles = () =>
  fs
    .readdirSync(codeDir)
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => path.join('src', STUDY, f));

// This study's code digest: Priority 3's evaluation files (unchanged) and this study's own modules.
export const diagnosticDigest = () =>
  createHash('sha256')
    .update([...evaluationFiles, ...studyFiles()].map((f) => `${f}:${sha256File(path.join(repoRoot, f))}`).join('\n'))
    .digest('hex');

export const checkP3 = () => {
  const evalDigest = codeDigest();
  const closure = closureDigest(codeClosure());

  if (evalDigest !== p3.evaluationDigest) throw new Error(`Priority 3's evaluation code changed: ${evalDigest}`);
  if (closure !== p3.closureDigest) throw new Error(`Priority 3's code closure changed: ${closure}`);
  for (const name of Object.keys(p3.records)) readP3(name);
  return { evaluationDigest: evalDigest, closureDigest: closure };
};

export const archivePins = () => Object.fromEntries(p3.archives.map((job) => [job, sha256File(archiveFile(job))]));

// A code change after the freeze is accepted only with an amendment in AMENDMENTS.md and its acknowledged digest here.
export const acknowledgementsFile = path.join(resultsDir, 'code-acknowledgements.jsonl');

export const acknowledged = (): { digest: string; amendment: string; t: string }[] => {
  if (!fs.existsSync(acknowledgementsFile)) return [];

  const amendments = fs.readFileSync(path.join(researchDir, 'AMENDMENTS.md'), 'utf8');

  return fs
    .readFileSync(acknowledgementsFile, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { digest: string; amendment: string; t: string })
    .filter((a) => amendments.includes(`### ${a.amendment} `));
};

interface Freeze {
  protocolSha256: string;
  manifestSha256: string;
  diagnosticDigest: string;
  archives: Record<string, string>;
}

// Every stage: the preflight, the committed freeze, the frozen code, Priority 3's pins and the archive pins.
export const guards = (o: { archives?: boolean } = {}) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (!isSealed(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json)');

  const f = readJson<Freeze>(freezeFile);

  if (sha256File(path.join(researchDir, 'PROTOCOL.md')) !== f.protocolSha256)
    throw new Error('PROTOCOL.md changed after the freeze');
  if (sha256File(manifestFile) !== f.manifestSha256)
    throw new Error('DIAGNOSTIC_MANIFEST.json changed after the freeze');
  const digest = diagnosticDigest();

  if (digest !== f.diagnosticDigest && !acknowledged().some((a) => a.digest === digest))
    throw new Error('the diagnostic code changed after the freeze without an acknowledged amendment');
  if (
    execSync(`git ls-files --error-unmatch ${rel(freezeFile)}`, { cwd: repoRoot })
      .toString()
      .trim() !== rel(freezeFile)
  )
    throw new Error('the freeze is not committed');
  if (
    execSync(`git status --porcelain -- ${rel(freezeFile)}`, { cwd: repoRoot })
      .toString()
      .trim()
  )
    throw new Error('the committed freeze differs from the file');
  checkP3();
  if (o.archives)
    for (const [job, sha] of Object.entries(f.archives))
      if (sha256File(archiveFile(job)) !== sha) throw new Error(`Priority 3's archive ${job} changed`);
  return f;
};

// ----- the ceilings (PROTOCOL.md §4.3): counted across every sealed stage record -----

export interface Counts {
  development: number;
  full: number;
  probes: number;
  observerBooks: number;
}

const stageFiles = {
  R: path.join(resultsDir, 'development', 'participation.json'),
  S: path.join(resultsDir, 'archive', 'audit.json'),
  N: path.join(resultsDir, 'risk', 'neighbourhoods.json'),
  P: path.join(resultsDir, 'risk', 'probes.json'),
  F: path.join(resultsDir, 'full', 'retrospective.json')
};

export const usedSoFar = (): Counts => {
  const sum: Counts = { development: 0, full: 0, probes: 0, observerBooks: 0 };

  for (const f of Object.values(stageFiles))
    if (fs.existsSync(f)) {
      const c = readJson<{ counts: Counts }>(f).counts;

      for (const k of Object.keys(sum) as (keyof Counts)[]) sum[k] += c[k] ?? 0;
    }
  return sum;
};

const within = (planned: Partial<Counts>) => {
  const used = usedSoFar();

  for (const k of Object.keys(planned) as (keyof Counts)[])
    if (used[k] + (planned[k] ?? 0) > ceilings[k])
      throw new Error(`the ${k} ceiling ${ceilings[k]} would be exceeded (${used[k]} used, ${planned[k]} planned)`);
};

const refuseRerun = (file: string) => {
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: this stage is complete (sealed records never rerun)`);
};

const openD24 = async (purpose: string) => {
  for (const s of ['GDX', 'VGT'] as const) verifyDoorFile('D24', s);

  const door = await openPrefixDoor('D24', purpose, true);

  logDoor('D24', purpose, { sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });
  return door;
};

// ----- R: reproduce every subject on D24 and observe its participation -----

const participationOf = (ob: Observed, counters: { books: number; gateChecks: number }) => ({
  rec: ob.rec,
  pool: poolTimeOf(ob),
  funnels: Object.fromEntries((['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const).map((b) => [b, funnelOf(ob, b)])),
  refusals: refusalsOf(ob, counters),
  dd: ddEpisodeOf(ob),
  lots: ob.result.lots.map((l) => ({
    id: l.id,
    book: l.book,
    kind: l.trade.kind,
    decision: ob.door.dates[l.trade.dS],
    entry: ob.door.dates[l.entryS],
    exit: l.open ? null : ob.door.dates[l.fills.at(-1)!.s],
    partials: l.fills.filter((f) => f.partial).length,
    net: r2(l.net)
  }))
});

export const stageR = async () => {
  const file = stageFiles.R;

  refuseRerun(file);
  guards();

  const subjects = loadSubjects();

  within({ development: subjects.length + 1 });

  const door = await openD24('stage R: reproduce the frozen subjects and observe participation (development)');
  const counters = { books: 0, gateChecks: 0 };
  const rows: Record<string, unknown>[] = [];
  let development = 0;

  for (const s of subjects) {
    const ob = observe(door, s.quad, s.options, counters);

    development++;

    const diff = firstDifference(plain(ob.rec), s.evidence.centre);

    if (diff) throw new Error(`${s.key} does not reproduce its sealed centre: ${diff}`);
    rows.push({
      key: s.key,
      label: s.label,
      group: s.group,
      id: s.id,
      enabled: s.enabled,
      reproduced: true,
      ...participationOf(ob, counters)
    });
    log(`R ${s.key}: net ${s.evidence.centre.net} reproduced`);
  }

  // the native bridge of VG #2 (Study 8's arming 2017-06-15): Study 8's sealed F24 centre
  const d = subjects.find((s) => s.key === 'D')!;
  const nat = observe(door, d.quad, nativeOptions(d), counters);

  development++;

  const native = {
    net: nat.rec.net,
    dd: nat.rec.dd,
    lots: nat.rec.lots,
    refusals: nat.result.funding.filter((f) => f.outcome === 'refused' && f.reason === 'slot occupied').length,
    target: { net: 260223.13, dd: 17280.74, lots: 36, refusals: 14 }
  };

  if (native.net !== 260223.13 || native.dd !== 17280.74 || native.lots !== 36 || native.refusals !== 14)
    throw new Error(`VG #2 native does not reproduce Study 8: ${JSON.stringify(native)}`);

  const counts: Counts = { development, full: 0, probes: 0, observerBooks: counters.books };

  sealJson(
    file,
    {
      stage: 'R',
      door: 'D24',
      subjects: rows,
      native: { ...native, ...participationOf(nat, counters) },
      counts,
      gateChecks: counters.gateChecks,
      finished: new Date().toISOString()
    },
    'R participation'
  );
  log(
    `R sealed: ${rows.length} subjects + the native bridge; ${counters.books} observer book runs (${counters.gateChecks} gate checks)`
  );
};

// ----- S: the search and promotion audit (archives only) -----

export const stageS = async () => {
  const file = stageFiles.S;

  refuseRerun(file);
  guards({ archives: true });

  const subjects = loadSubjects();
  const appA = subjects.find((s) => s.key === 'A')!.quad.g.GDX;
  const gsel = readP3<{ evidence: { id: string; qualified: boolean }[] }>('results/gpair/C24/selection.json');
  const csel = readP3<{ evidence: { id: string; qualified: boolean }[] }>('results/folds/C24/selection.json');
  const qualified = new Set([...gsel.evidence, ...csel.evidence].filter((e) => e.qualified).map((e) => e.id));
  const lanes: unknown[] = [];
  const volume: Record<string, unknown> = {};

  for (const [arm, job] of [
    ['gpair', 'search-C24-gpair'],
    ['indep', 'search-C24-indep'],
    ['informed', 'search-C24-informed']
  ] as const) {
    const sealed = readP3<{ lanes: LaneResult[]; seeds?: { label: string; quad: unknown }[] }>(
      `results/search/C24/${arm}.json`
    );
    const arc = new Archive(job);

    for (const lane of sealed.lanes) {
      const a = auditLane(arc, lane, arm, appA, qualified);

      for (const [k, v] of Object.entries(a.verified))
        if (v.sealed !== v.recomputed)
          throw new Error(`${lane.key}: ${k} recomputed ${v.recomputed}, sealed ${v.sealed}`);
      lanes.push(a);
      log(`S ${lane.key}: verified ${Object.keys(a.verified).join(', ')}`);
    }

    volume[job] = { ...volumeOf(arc), configs: arc.count('configs'), points: arc.count('points') };
    if (arm === 'informed') volume.informedSeeds = (sealed.seeds ?? []).map((s) => s.label);
    arc.close();
  }

  const counts: Counts = { development: 0, full: 0, probes: 0, observerBooks: 0 };

  sealJson(
    file,
    { stage: 'S', lanes, volume, counts, finished: new Date().toISOString() },
    'S search and promotion audit'
  );
  log('S sealed');
};

// ----- N: the neighbourhoods (archives) and the draw replays (D24) -----

export const replaySets = { all: ['A', 'B'], tail: ['C', 'D', 'IP'] }; // PROTOCOL.md §7.3

export const stageN = async () => {
  const file = stageFiles.N;

  refuseRerun(file);
  guards({ archives: true });

  const subjects = loadSubjects();
  const qa = new Archive('qualify-C24');
  const qg = new Archive('qualify-gpair-C24');
  const out: Record<string, unknown> = {};
  const confirmDraws = new Map<string, Draw[]>();

  for (const key of ['A', 'B', 'C', 'D', 'IP', 'XP', 'SP', 'GP4', 'GP085']) {
    const s = subjects.find((x) => x.key === key)!;
    const arc = s.need === 'G' ? qg : qa;
    const fams = familiesOf(s);
    const families: Record<string, unknown> = {};

    for (const [name, fs_] of Object.entries(fams)) {
      const draws = pooledDraws(s, fs_, name, archivedReader(arc));
      const sealed =
        name === 'confirm'
          ? s.evidence.confirm
          : name === 'small'
            ? s.evidence.small
            : name === 'wide'
              ? s.evidence.wide
              : (s.evidence.scopes as Record<string, never>)[name.slice(6)];
      if (!sealed) throw new Error(`${key} ${name}: no sealed statistics to reproduce`);

      const bad = sealedMatches(s.evidence.centre, draws, sealed);

      if (bad) throw new Error(`${key} ${name}: the reconstructed draws do not reproduce the sealed statistics`);
      families[name] = tailOf(s.evidence.centre, draws);
      if (name === 'confirm') confirmDraws.set(key, draws);
    }

    const draws = confirmDraws.get(key)!;
    const base = s.need === 'G' ? 'g' : 'joint';
    const inputs = inputsOf(s.quad, base, s.enabled);

    out[key] = {
      label: s.label,
      group: s.group,
      gates: s.evidence.gates,
      failed: s.evidence.failed,
      draws: { drawn: s.evidence.confirmDraws.drawn, unique: draws.length },
      inputs: {
        perturbed: inputs.filter((x) => x.active).length,
        inertDisabled: inputs.filter((x) => x.active && !x.enabled).length,
        inactive: inputs.filter((x) => !x.active).length
      },
      families,
      association: associationOf(inputs, draws).slice(0, 12),
      toggles: Object.fromEntries(
        Object.entries(s.evidence.toggles).map(([k, r]) => [k, { net: (r as Rec).net, dd: (r as Rec).dd }])
      ),
      perDraw: draws.map((d) => ({
        row: d.row,
        rep: d.rep,
        id: d.id,
        net: d.rec.net,
        dd: d.rec.dd,
        signature: d.rec.signature,
        clipped: d.clipped,
        funded: d.rec.funded
      }))
    };
    log(`N ${key}: every family reproduces its sealed statistics`);
  }

  qa.close();
  qg.close();

  // the replays: every confirmation draw of A and B; the worst ⌈0.1 n⌉ of C, D and the informed primary
  const pick = (key: string) => {
    const d = confirmDraws.get(key)!;

    if (replaySets.all.includes(key)) return d;

    const k = Math.ceil(0.1 * d.length);

    return [...d].sort((a, b) => b.rec.dd - a.rec.dd || (a.id < b.id ? -1 : 1)).slice(0, k);
  };
  const planned = [...replaySets.all, ...replaySets.tail].reduce((a, k) => a + pick(k).length, 0);

  within({ development: planned + replaySets.all.length + replaySets.tail.length });

  const door = await openD24('stage N: confirmation-draw replays (development)');
  const counters = { books: 0, gateChecks: 0 };
  const replays: Record<string, unknown[]> = {};
  let development = 0;

  for (const key of [...replaySets.all, ...replaySets.tail]) {
    const s = subjects.find((x) => x.key === key)!;
    const centre = observe(door, s.quad, s.options, counters, false);

    development++;
    replays[key] = [];

    for (const d of pick(key)) {
      const ob = observe(door, d.quad, s.options, counters, false);

      development++;

      // both sides in the archive's encoding (the archived record is decoded on read: NaN stays NaN)
      const diff = firstDifference(plain(ob.rec), plain(d.rec));

      if (diff) throw new Error(`${key} draw ${d.id} does not reproduce its archived record: ${diff}`);

      const dd = ddEpisodeOf(ob);

      if (Math.abs(dd.reconciled) > 1e-4)
        throw new Error(`${key} draw ${d.id}: the drawdown does not reconcile (${dd.reconciled})`);
      replays[key]!.push({
        row: d.row,
        rep: d.rep,
        id: d.id,
        net: ob.rec.net,
        dd: ob.rec.dd,
        breach: ob.rec.dd > economics.ceiling,
        divergence: divergenceOf(ob, centre),
        episode: dd,
        funded: ob.rec.funded,
        lotsBy: Object.fromEntries(Object.entries(ob.rec.books).map(([b, c]) => [b, c.lots])),
        moved: inputsOf(s.quad, s.need === 'G' ? 'g' : 'joint', s.enabled)
          .filter((x) => x.active)
          .map((x) => {
            const f = x.book.startsWith('D1') ? 'd1' : 'g';
            const sym = x.book.slice(x.book.indexOf(':') + 1) as 'GDX' | 'VGT';
            const c = (s.quad[f][sym] as Record<string, unknown>)[x.key] as number;
            const v = (d.quad[f][sym] as Record<string, unknown>)[x.key] as number;

            return v === c
              ? null
              : {
                  book: x.book,
                  key: x.key,
                  centre: c,
                  value: v,
                  u: Math.round(d.u[x.column]! * 1e4) / 1e4,
                  radius: radiusOf(x.book, x.key)
                };
          })
          .filter(Boolean)
      });
    }

    log(`N ${key}: ${replays[key]!.length} draws replayed, every record reproduced`);
  }

  const counts: Counts = { development, full: 0, probes: 0, observerBooks: counters.books };

  sealJson(
    file,
    { stage: 'N', neighbourhoods: out, replays, replaySets, counts, finished: new Date().toISOString() },
    'N neighbourhoods and replays'
  );
  log(`N sealed: ${development} development simulations`);
};

// ----- P: the frozen probes (PROTOCOL.md §7.4) -----

export const probeDesign = {
  P1: { subject: 'A', book: 'G:GDX', us: [-1, -0.5, -0.25, 0.25, 0.5, 1] },
  P2: { subject: 'B', book: 'G:GDX', us: [-1, -0.5, 0.5, 1] },
  P3: { subject: 'A', book: 'D1:GDX', us: [-1, -0.5, 0.5, 1] },
  P4: { subject: 'A', from: 'P1', us: [-1, -0.5, 0.5, 1] } // the two P1 inputs with the largest DD range, crossed
};

export const stageP = async () => {
  const file = stageFiles.P;

  refuseRerun(file);
  guards();

  const subjects = loadSubjects();
  const used = usedSoFar();
  const door = await openD24('stage P: the frozen one- and two-factor probes (development)');
  const counters = { books: 0, gateChecks: 0 };
  const rows: Record<string, unknown>[] = [];
  const centres = new Map<string, Observed>();
  let development = 0;
  let probes = 0;
  let duplicates = 0;
  const run1 = (set: string, s: Subject, book: string, key: string, u: number, key2?: string, u2?: number) => {
    let m = moveInput(s.quad, book, key, u);
    let m2: ReturnType<typeof moveInput> | null = null;

    if (key2 !== undefined && u2 !== undefined) {
      m2 = moveInput(m.quad, book, key2, u2);
      m = { ...m, quad: m2.quad };
    }

    const id = quadId(m.quad);

    if (id === s.id || rows.some((r) => r.set === set && r.id === id)) {
      duplicates++;
      rows.push({
        set,
        subject: s.key,
        book,
        key,
        u,
        key2,
        u2,
        id,
        duplicate: true,
        value: m.value,
        value2: m2?.value
      });
      return null;
    }

    if (used.probes + probes + 1 > ceilings.probes || used.development + development + 1 > ceilings.development)
      throw new Error('a probe or development ceiling would be exceeded');

    const ob = observe(door, m.quad, s.options, counters, false);

    development++;
    probes++;

    const dd = ddEpisodeOf(ob);
    const row = {
      set,
      subject: s.key,
      book,
      key,
      u,
      key2,
      u2,
      id,
      value: m.value,
      value2: m2?.value,
      clipped: m.clipped || (m2?.clipped ?? false),
      radius: radiusOf(book, key),
      net: ob.rec.net,
      dd: ob.rec.dd,
      breach: ob.rec.dd > economics.ceiling,
      lotsBy: Object.fromEntries(Object.entries(ob.rec.books).map(([b, c]) => [b, c.lots])),
      divergence: divergenceOf(ob, centres.get(s.key)!),
      dominant: dd.dominant,
      trough: dd.trough,
      peak: dd.peak
    };

    rows.push(row);
    return row;
  };

  for (const key of ['A', 'B']) {
    const s = subjects.find((x) => x.key === key)!;

    centres.set(key, observe(door, s.quad, s.options, counters, false));
    development++;
  }

  for (const set of ['P1', 'P2', 'P3'] as const) {
    const d = probeDesign[set];
    const s = subjects.find((x) => x.key === d.subject)!;

    for (const x of inputsOf(s.quad, 'joint', s.enabled).filter((i) => i.active && i.book === d.book))
      for (const u of d.us) run1(set, s, d.book, x.key, u);
    log(`P ${set}: done`);
  }

  // P4: the two P1 inputs with the largest drawdown range (the centre included), crossed on the P4 grid
  const a = subjects.find((x) => x.key === 'A')!;
  const range = new Map<string, number>();

  for (const r of rows.filter((x) => x.set === 'P1' && !x.duplicate)) {
    const k = r.key as string;
    const prev = range.get(k) ?? 0;
    const lo = Math.min(
      a.evidence.centre.dd,
      ...rows.filter((x) => x.set === 'P1' && x.key === k && !x.duplicate).map((x) => x.dd as number)
    );
    const hi = Math.max(
      a.evidence.centre.dd,
      ...rows.filter((x) => x.set === 'P1' && x.key === k && !x.duplicate).map((x) => x.dd as number)
    );

    range.set(k, Math.max(prev, hi - lo));
  }

  const top = [...range.entries()]
    .sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))
    .slice(0, 2)
    .map(([k]) => k);

  for (const u of probeDesign.P4.us)
    for (const u2 of probeDesign.P4.us) run1('P4', a, 'G:GDX', top[0]!, u, top[1]!, u2);

  const counts: Counts = { development, full: 0, probes, observerBooks: counters.books };

  sealJson(
    file,
    {
      stage: 'P',
      design: probeDesign,
      p4Inputs: top,
      p1Ranges: Object.fromEntries(range),
      centres: Object.fromEntries([...centres].map(([k, ob]) => [k, { net: ob.rec.net, dd: ob.rec.dd }])),
      rows,
      duplicates,
      counts,
      finished: new Date().toISOString()
    },
    'P probes'
  );
  log(`P sealed: ${probes} probes (${duplicates} duplicates of the centre or an earlier probe, not run)`);
};

// ----- F: the retrospective replay of the frozen subjects on FULL (2016-01-04 → 2026-10-30) -----

export const stageF = async () => {
  const file = stageFiles.F;

  refuseRerun(file);
  guards();

  const subjects = loadSubjects().filter((s) => s.full);
  const validation = readP3<{
    rows: {
      label: string;
      id: string;
      record: Rec;
      validationNet: number;
      validationDd: number;
      wholeNet: number;
      wholeDd: number;
    }[];
    targets: unknown;
  }>('results/validation/validation.json');

  within({ full: subjects.length + 1 });

  const guard = { file: path.join(p3.dir, 'FROZEN_SELECTION.json'), sha256: p3.frozenSelectionSha256 };
  const door: Door = await openFullDoor('stage F', guard, true);

  logDoor('FULL', 'stage F: retrospective replay of the frozen subjects (previously examined history)', {
    guard: guard.sha256,
    sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 }
  });

  if (door.dates.at(-1) !== chronology.validationEnd)
    throw new Error('FULL does not end at the common complete endpoint');

  const b = door.dates.indexOf(boundary);
  const dev = { from: 0, to: b };
  const val = { from: b + 1, to: door.sessions - 1 };
  const counters = { books: 0, gateChecks: 0 };
  const rows: Record<string, unknown>[] = [];
  let full = 0;

  for (const s of subjects) {
    const o = { ...s.options, boundaries: [boundary] };
    const ob = observe(door, s.quad, o, counters);

    full++;

    const sealed = validation.rows.find((r) => r.label === s.label);

    if (!sealed) throw new Error(`${s.key} has no sealed validation row`);

    const diff = firstDifference(plain(ob.rec), sealed.record);

    if (diff) throw new Error(`${s.key} does not reproduce its sealed FULL record: ${diff}`);

    const refusals = refusalsOf(ob, counters);
    const valT = door.sym.VGT.ds.sCloseTime[b]!;

    rows.push({
      key: s.key,
      label: s.label,
      group: s.group,
      reproduced: true,
      validationNet: sealed.validationNet,
      validationDd: sealed.validationDd,
      wholeNet: sealed.wholeNet,
      wholeDd: sealed.wholeDd,
      pool: { development: poolTimeOf(ob, dev), validation: poolTimeOf(ob, val) },
      funnels: {
        development: Object.fromEntries(
          (['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const).map((x) => [x, funnelOf(ob, x, dev)])
        ),
        validation: Object.fromEntries(
          (['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const).map((x) => [x, funnelOf(ob, x, val)])
        )
      },
      refusalsValidation: refusals.filter((r) => r.decisionT > valT),
      crossing: ob.result.lots
        .filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b))
        .map((l) => ({
          book: l.book,
          entry: door.dates[l.entryS],
          exit: l.open ? null : door.dates[l.fills.at(-1)!.s],
          net: r2(l.net)
        })),
      lotsValidation: ob.result.lots
        .filter((l) => l.entryS > b)
        .map((l) => ({
          book: l.book,
          kind: l.trade.kind,
          entry: door.dates[l.entryS],
          exit: l.open ? null : door.dates[l.fills.at(-1)!.s],
          net: r2(l.net),
          open: l.open
        })),
      bookedValidation: Object.fromEntries(
        (['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const).map((x) => [
          x,
          r2(ob.result.lots.filter((l) => l.book === x && l.entryS > b).reduce((a, l) => a + l.net, 0))
        ])
      )
    });
    log(`F ${s.key}: reproduced (validation ${sealed.validationNet})`);
  }

  // VG #2's native bridge on FULL (Study 8's 2017-06-15 arming): the known $334,911.93 / $21,303.61
  const d = loadSubjects().find((s) => s.key === 'D')!;
  const nat = observe(door, d.quad, { ...nativeOptions(d), boundaries: [boundary] }, counters);

  full++;

  if (nat.rec.net !== 334911.93 || nat.rec.dd !== 21303.61)
    throw new Error(`VG #2 native FULL: ${nat.rec.net} / ${nat.rec.dd}`);

  const counts: Counts = { development: 0, full, probes: 0, observerBooks: counters.books };

  sealJson(
    file,
    {
      stage: 'F',
      door: 'FULL',
      boundary,
      endpoint: chronology.validationEnd,
      note: 'retrospective explanation of frozen subjects on previously examined history; nothing is selected or ranked',
      rows,
      native: { net: nat.rec.net, dd: nat.rec.dd, validation: nat.rec.periods },
      counts,
      finished: new Date().toISOString()
    },
    'F retrospective'
  );
  log(`F sealed: ${full} full-history simulations`);
};

export const verify = () => verifySeals();
export { stageFiles };
