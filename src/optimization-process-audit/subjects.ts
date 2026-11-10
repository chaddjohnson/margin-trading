// Subject adapters (PROTOCOL.md §4, §5, AD4): each subject's own configuration path, draw generators, feasibility,
// roles and slice semantics, reused unchanged through one interface. Archives are opened READ-ONLY with node:sqlite
// (never through a writer), and no subject function that writes a log or a record is ever called.
import { DatabaseSync } from 'node:sqlite';
import { decode } from '../growth140-vgt-s8m/store.ts';
import { type Door, openFullDoor, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import { frozenSelectionFile as p3FrozenSelectionFile } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { type EvalOptions, type Rec, evalKey, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { type Nb, nbStats } from '../vg-d1-growth-joint/fitness.ts';
import { type Tail, tailOf } from '../vg-d1-growth-diagnostic/risk.ts';
// 3B
import {
  type Cfg as Cfg3B,
  activeInputs as active3B,
  cellName,
  cellOf,
  cfgId,
  neighbourhood,
  optionsOf
} from '../vg-d1-growth-expanded/config.ts';
import { fitOf as fitOf3B, plausible as plausible3B } from '../vg-d1-growth-expanded/fitness.ts';
import { rolesOf as rolesOf3B } from '../vg-d1-growth-expanded/qualify.ts';
import { sliceMarks as sliceMarks3B } from '../vg-d1-growth-expanded/folds.ts';
// 4A
import { type Built, type GConfig, activeInputs as active4A, anchorS, buildS, entryOf, rowsOf } from '../gdx-growth-standalone/space.ts';
import { fitOf as fitOf4A, plausible as plausible4A } from '../gdx-growth-standalone/fitness.ts';
import { rolesOf as rolesOf4A } from '../gdx-growth-standalone/qualify.ts';
import { sliceMarks as sliceMarks4A } from '../gdx-growth-standalone/folds.ts';
import { type Cut, type DoorName, chronology, cuts } from './context.ts';
import { logDoor, readJson } from './records.ts';
import { type SubjectKey, sources } from './sources.ts';

export type { Nb, Rec, Tail, Quad, EvalOptions };

// ----- a configuration as this study handles it -----

export interface Conf {
  subject: SubjectKey;
  id: string; // the subject's own canonical identity (3B cfgId, 4A built id)
  quad: Quad;
  options: EvalOptions;
  cell: string; // the structural group (3B inclusion × entries; 4A rise | breakout)
  raw: Cfg3B | GConfig; // the subject's configuration object
}

export const conf3B = (c: Cfg3B): Conf => ({
  subject: '3B',
  id: cfgId(c),
  quad: c.quad,
  options: optionsOf(c),
  cell: cellName(cellOf(c)),
  raw: c
});

export const conf4A = (g: GConfig): Conf => {
  const b = buildS(g);

  return { subject: '4A', id: b.id, quad: b.quad, options: b.options, cell: entryOf(g), raw: g };
};

export const activeInputsOf = (c: Conf) =>
  c.subject === '3B' ? active3B(c.raw as Cfg3B) : active4A(buildS(c.raw as GConfig), 'joint');

// ----- the sealed evidence of a cutoff -----

export interface SealedEvidence {
  label: string;
  kind: string;
  lane: string;
  id: string;
  qualified: boolean;
  selectable: boolean;
  failed: string[];
  centre: Rec;
  select: Nb;
  confirm: Nb;
  cfg?: Cfg3B;
  gdx?: GConfig;
  quad: Quad;
  [k: string]: unknown;
}

export interface SealedSelection {
  primary: string | null;
  independentPrimary?: string | null;
  roles: Record<string, { roles: Record<string, string | null>; ranked: { label: string }[]; qualified: number; members: number }>;
  evidence: SealedEvidence[];
  codeDigest: string;
}

const selCache = new Map<string, SealedSelection>();

export const selectionOf = (s: SubjectKey, cut: Cut): SealedSelection => {
  const k = `${s}|${cut}`;

  if (!selCache.has(k)) selCache.set(k, readJson<SealedSelection>(sources[s].selectionRecord(cut)));
  return selCache.get(k)!;
};

export const isIndependent = (s: SubjectKey, e: SealedEvidence) => (s === '3B' ? e.kind === 'indep' : e.kind === 'independent');

export const confOfEvidence = (s: SubjectKey, e: SealedEvidence): Conf => {
  if (s === '3B') return conf3B(e.cfg!);

  const c = conf4A(e.gdx!);

  if (c.id !== e.id) throw new Error(`4A ${e.label}: built id ${c.id} ≠ sealed ${e.id}`);
  return c;
};

// The independent set and its qualified members E(s, c) (PROTOCOL.md §4).
export const independentSet = (s: SubjectKey, cut: Cut) => selectionOf(s, cut).evidence.filter((e) => isIndependent(s, e));
export const eligibleSet = (s: SubjectKey, cut: Cut) => independentSet(s, cut).filter((e) => e.qualified);

// The subjects' own role functions on sealed evidence (gate G2).
export const rolesOfSubject = (s: SubjectKey, set: string, ev: readonly SealedEvidence[]) =>
  s === '3B' ? rolesOf3B(set, ev as never) : rolesOf4A(set, ev as never);

// ----- neighbourhood draws (each subject's own generator and pooling) -----

export interface Draw {
  quad: Quad;
  options: EvalOptions;
  id: string;
  clipped: number;
}

export const familyDraws = (c: Conf, name: string, labels: (string | number)[], n: number, scale = 1): Draw[] => {
  if (c.subject === '3B')
    return neighbourhood(c.raw as Cfg3B, { name, n, labels, scope: 'joint', scale }).map((p) => ({
      quad: p.cfg.quad,
      options: c.options,
      id: p.id,
      clipped: p.clipped
    }));

  const b: Built = buildS(c.raw as GConfig);

  return rowsOf(b, { name, n, labels, scope: 'joint', scale }).map((r) => ({
    quad: r.quad,
    options: r.options,
    id: r.id,
    clipped: r.clipped,
    dup: r.dup
  }));
};

// The selection family exactly as each subject pooled it (3B: de-duplicated across reps; 4A: the centre excluded too).
export const selectionDraws = (c: Conf, cut: Cut): Draw[] => {
  const seen = new Set<string>(c.subject === '4A' ? [c.id] : []);
  const out: Draw[] = [];

  for (let rep = 1; rep <= 2; rep++)
    for (const d of familyDraws(c, 'select', ['select', rep, cut], 128)) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      out.push(d);
    }

  return out;
};

// The search's rung-1 (or refinement) 16-draw family of a fitted configuration, de-duplicated as the search did.
export const searchDraws = (c: Conf, cut: Cut, rung: 'r1' | 'refine'): Draw[] => {
  if (c.subject === '3B') {
    const seen = new Set<string>([c.id]);

    return familyDraws(c, rung, [rung, cut], 16).filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }

  return familyDraws(c, rung, [rung, cut], 16).filter((d) => !(d as Draw & { dup?: boolean }).dup);
};

export const plausibleOf = (c: Conf, r: Rec) => (c.subject === '3B' ? plausible3B(r) : plausible4A(anchorS, r));

export const fitOfConf = (c: Conf, rung: string, centre: Rec, nb: Nb | null) =>
  c.subject === '3B'
    ? fitOf3B(rung, c.id, (c.raw as Cfg3B).inc, centre, nb)
    : fitOf4A(anchorS, rung, c.id, centre, nb);

export { nbStats, tailOf };

// ----- read-only archives -----

export class Archive {
  private readonly db: DatabaseSync;
  private readonly getPoint: ReturnType<DatabaseSync['prepare']>;
  reads = 0;
  misses = 0;

  constructor(readonly file: string) {
    this.db = new DatabaseSync(file, { readOnly: true });
    this.getPoint = this.db.prepare('SELECT json FROM points WHERE key = ?');
  }

  meta() {
    return Object.fromEntries(
      (this.db.prepare('SELECT k, v FROM meta').all() as { k: string; v: string }[]).map((r) => [r.k, r.v])
    );
  }

  point(key: string): Rec | undefined {
    const row = this.getPoint.get(key) as { json: string } | undefined;

    if (!row) {
      this.misses++;
      return undefined;
    }

    this.reads++;
    return decode<Rec>(row.json);
  }

  *configs(): Generator<{ id: string; value: unknown }> {
    for (const row of this.db.prepare('SELECT key, json FROM configs').iterate() as Iterable<{ key: string; json: string }>)
      yield { id: row.key, value: decode(row.json) };
  }

  config(id: string): unknown {
    const row = this.db.prepare('SELECT json FROM configs WHERE key = ?').get(id) as { json: string } | undefined;

    return row ? decode(row.json) : undefined;
  }

  count(table: 'points' | 'configs') {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  }

  close() {
    this.db.close();
  }
}

export const keyOf = (door: string, quad: Quad, options: EvalOptions) => evalKey(door, quad, options);

// Reads every draw's archived record; undefined if any is missing.
export const archivedRecs = (arc: Archive, door: string, draws: readonly Draw[]) => {
  const recs: Rec[] = [];

  for (const d of draws) {
    const r = arc.point(keyOf(door, d.quad, d.options));

    if (!r) return undefined;
    recs.push(r);
  }

  return recs;
};

// ----- doors (this study logs its own openings; the subjects' door logs are never written) -----

const doorCache = new Map<DoorName, Door>();

export const openDoor = async (name: DoorName, purpose: string, guard?: { file: string; sha256: string }) => {
  if (doorCache.has(name)) {
    logDoor(name, purpose, { reused: true, ...(guard ? { guard } : {}) });
    return doorCache.get(name)!;
  }

  const door =
    name === 'FULL'
      ? await openFullDoor(purpose, { file: p3FrozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true)
      : await openPrefixDoor(name, purpose, true);

  logDoor(name, purpose, {
    sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
    sessions: door.sessions,
    last: door.dates.at(-1),
    ...(guard ? { guard } : {})
  });
  doorCache.set(name, door);
  return door;
};

export const closeDoors = () => doorCache.clear();

// ----- runs -----

let runs = 0;

const maybeGc = () => {
  runs++;
  if (runs % 32 === 0 && typeof globalThis.gc === 'function') globalThis.gc();
};

export const evaluateConf = (door: Door, c: Pick<Conf, 'quad' | 'options'>, extra: EvalOptions = {}): Rec => {
  const o = { ...c.options, ...extra };
  const x = run(door, c.quad, o);
  const rec = recordOf(door, c.quad, x, o);

  maybeGc();
  return rec;
};

export const detailedRun = (door: Door, c: Pick<Conf, 'quad' | 'options'>, extra: EvalOptions = {}) => {
  const o = { ...c.options, ...extra };
  const x = run(door, c.quad, o, true);

  maybeGc();
  return { x, rec: recordOf(door, c.quad, x, o), options: o };
};

// The subject's own continuous slice run (its fold-evaluation semantics): marks after the boundary close, rebased.
export const sliceRun = (door: Door, c: Conf, boundary: string) => {
  const o: EvalOptions = { ...c.options, boundaries: [boundary] };
  const x =
    c.subject === '3B'
      ? sliceMarks3B(door, c.raw as Cfg3B, o, boundary)
      : (sliceMarks4A(door, c.quad, o, boundary) as ReturnType<typeof sliceMarks3B>);

  maybeGc();
  return x;
};

export const cutDoor = (cut: Cut) => cuts[cut].door;
export { chronology };
