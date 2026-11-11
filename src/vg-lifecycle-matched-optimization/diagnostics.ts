// The development diagnostics (PROTOCOL.md §11.3; report-only, never a selection input), sealed before the frozen
// selection.
//
// 1. Mechanism (D24): for each arm's final and independent primaries, C4, C4-refined and D, under EVERY lifecycle (the
//    cross cells too): the funded-lot ledger with each lot's source (crossing, latched / renewal / release eligibility,
//    breakout, a continuation method, L2 retained), the Growth request log (granted / refused / waiting, by kind), the
//    L2 retained opportunities (waits, gate blocks, expiry, invalidation, supersession, entries), every refusal with
//    its occupant, the canonical decision outcomes of each Growth book (signals, filter / eligibility vetoes, deferrals,
//    fills), the pool's time (held / reserved / idle closes) and L0's unfunded virtual holds with their idle overlap;
//    holding periods and the deepest drawdown episodes; matched lots (newly admitted, displaced, retimed; reconciled)
//    against the same phenotype under L0 (the direct lifecycle effect) and, for each arm's primaries, against L0's
//    primary under L0 (the total effect). Hypothetical (virtual) profits are never summed as achievable.
// 2. Episode dependence of the neighbourhoods (the process audit's lesson, reporting only): for each arm's principal
//    role holders (C24 final and independent primaries on D24; the fold primaries on their training doors), the
//    selection rep-1 neighbours (128) rerun in detail under the holder's own lifecycle: the share whose largest winning
//    pool-level episode overlaps the centre's, the distribution of each neighbour's net earned by lots entered inside the
//    centre's leading-episode window (neighbours with net ≤ 0 counted apart, never divided), distinct ledgers and
//    clipping. No overlap threshold qualifies or disqualifies anything.
import fs from 'node:fs';
import path from 'node:path';
import { type BookId, bookIds, familyOf } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, episodesOf, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { csv, drawdownEpisodes, holdingOf, lotRows, matchLots } from '../vg-d1-growth-joint/post.ts';
import {
  growthFundingOf,
  ledgerOf,
  requestsOf,
  retainedOf,
  sourcesOf,
  summaryOf
} from '../vg-growth-funding-lifecycle/evaluate.ts';
import { type LifeBook, lifeBookOf } from '../vg-growth-funding-lifecycle/growthBook.ts';
import { simulationCaps } from './budgets.ts';
import { type Mode, log, modes, r2, repoRoot } from './context.ts';
import { type Cfg, cfgId, optionsOf } from './config.ts';
import { controlOf, settingsOf } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { dMember } from './folds.ts';
import { runLife } from './life.ts';
import { type Evidence, type Roles, drawsOf, famOf } from './qualify.ts';
import { isSealed, plain, readJson, sha256File, sha256Text } from './records.ts';
import { type Env, cutoffs, finalCutoff, seal, selectionFile, studyGuards } from './stages.ts';

export const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics');
export const finalOf = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');
export const foldsOf = (env: Env) => (env.schedule === 'study' ? ['C19', 'C21', 'C23'] : ['P18']);

export interface SelectionRecord {
  primary: Record<Mode, string | null>;
  independentPrimary: Record<Mode, string | null>;
  roles: Record<string, Roles>;
  evidence: Evidence[];
}

const slug = (label: string) => label.replace(/[^A-Za-z0-9#._-]+/g, '_').slice(0, 90);
const iso = (door: Door, s: number) => door.dates[s] ?? null;

// The canonical decision outcomes of a Growth book's simulation, by status and reason, and its request log by kind.
const funnelOf = (book: LifeBook | undefined) => {
  if (!book) return null;

  const out: Record<string, number> = {};

  for (const o of book.simulation.outcomes) {
    const k = `${o.status}${o.reason ? `:${o.reason}` : ''}`;

    out[k] = (out[k] ?? 0) + 1;
  }

  return { decisions: book.simulation.outcomes.length, byStatus: out, trades: book.simulation.trades.length };
};

// Refusals by occupant (who held the capital), per Growth book.
const refusalsByOccupant = (r: PoolResult) => {
  const out: Partial<Record<BookId, Record<string, number>>> = {};

  for (const f of r.funding) {
    if (f.outcome !== 'refused' || familyOf(f.book) !== 'G') continue;

    const m = (out[f.book] ??= {});
    const k = f.occupantBook ?? f.reason ?? 'unknown';

    m[k] = (m[k] ?? 0) + 1;
  }

  return out;
};

// The Growth books of a run as LifeBooks (L0: the lifecycle engine in L0 mode, identical to the canonical books — 5A's
// stage V6 and this study's stage V), for their decision outcomes and request sources.
const lifeBooksOf = (door: Door, q: Cfg['quad'], o: EvalOptions, x: ReturnType<typeof runLife>) =>
  Object.fromEntries(
    x.books
      .filter((b) => b.book.startsWith('G:'))
      .map((b) => {
        const sym = b.book.slice(2) as 'GDX' | 'VGT';
        const lb = 'simulation' in b ? (b as LifeBook) : lifeBookOf(door.sym[sym], door, q.g[sym], 'L0', () => true);

        return [b.book, lb];
      })
  ) as Partial<Record<BookId, LifeBook>>;

export const runDiagnostics = async (env: Env) => {
  const dir = diagDir(env);
  const file = path.join(dir, 'diagnostics.json');
  const fin = finalOf(env);
  const selFile = selectionFile(env, fin);

  studyGuards(env);
  if (!finalCutoff(fin) || !isSealed(selFile)) throw new Error('the final selection is not sealed');
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const sel = readJson<SelectionRecord>(selFile);
  const ev = (label: string) => sel.evidence.find((x) => x.label === label)!;
  const door = await openStudyDoor(cutoffs[fin]!.door, `${env.prefix}diagnostics`);
  let simulations = 0;
  const files: Record<string, string> = {};
  const writeCsv = (name: string, rows: Record<string, unknown>[]) => {
    const f = path.join(dir, 'ledgers', name);
    const text = csv(rows);

    fs.mkdirSync(path.dirname(f), { recursive: true });
    if (fs.existsSync(f)) fs.chmodSync(f, 0o644);
    fs.writeFileSync(f, text);
    fs.chmodSync(f, 0o444);
    files[path.relative(dir, f)] = sha256Text(text);
  };

  // ----- 1. mechanism -----
  type Subject = { label: string; cfg: Cfg; options: EvalOptions; role: string };
  const subjects: Subject[] = [];
  const addSubject = (label: string | null, role: string) => {
    if (!label) return;

    const e = ev(label);
    const x = subjects.find((s) => cfgId(s.cfg) === e.id);

    if (x) x.role = `${x.role}; ${role}`;
    else subjects.push({ label, cfg: e.cfg, options: optionsOf(e.cfg), role });
  };

  for (const mode of modes) {
    addSubject(sel.primary[mode], `${mode} final primary`);
    addSubject(sel.independentPrimary[mode], `${mode} independent primary`);
  }
  for (const k of ['C4', 'C4R']) {
    const c = controlOf(k);
    const x = subjects.find((s) => cfgId(s.cfg) === cfgId(c.cfg!));

    if (x) x.role = `${x.role}; control ${k}`;
    else subjects.push({ label: `control: ${k}`, cfg: c.cfg!, options: optionsOf(c.cfg!), role: `control ${k}` });
  }

  const d = dMember('L0');

  subjects.push({ label: 'control: D', cfg: d.cfg, options: d.options!, role: 'D1-only comparator' });

  const runs = new Map<string, { x: ReturnType<typeof runLife>; books: Partial<Record<BookId, LifeBook>> }>();
  const runOf = (s: Subject, mode: Mode) => {
    const k = `${cfgId(s.cfg)}|${mode}`;
    let v = runs.get(k);

    if (!v) {
      const x = runLife(door, s.cfg.quad, s.options, mode);

      simulations++;
      v = { x, books: lifeBooksOf(door, s.cfg.quad, s.options, x) };
      runs.set(k, v);
    }
    return v;
  };
  const l0Primary = sel.primary.L0 ? subjects.find((s) => cfgId(s.cfg) === ev(sel.primary.L0!).id) ?? null : null;
  const mechanism = subjects.flatMap((s) =>
    modes.map((mode) => {
      const { x, books } = runOf(s, mode);
      const r = x.result;
      const rec = recordOf(door, s.cfg.quad, x, s.options);
      const summary = summaryOf(door, mode, x, null);
      const sources = new Map<BookId, Map<number, string>>();

      for (const [b, lb] of Object.entries(books)) sources.set(b as BookId, sourcesOf(lb!.simulation, lb!.life));

      const name = `${slug(s.label)}/${mode}`;
      const ledger = ledgerOf(door, r, sources);

      writeCsv(`${name}/lots.csv`, ledger.map((l) => ({ ...l, exits: JSON.stringify(l.exits) })) as Record<string, unknown>[]);
      writeCsv(`${name}/growth-funding.csv`, growthFundingOf(r) as unknown as Record<string, unknown>[]);
      for (const [b, life] of Object.entries(x.life)) {
        writeCsv(`${name}/${b.replace(':', '-')}-requests.csv`, requestsOf(door, life, sources.get(b as BookId)) as unknown as Record<string, unknown>[]);
        writeCsv(
          `${name}/${b.replace(':', '-')}-retained.csv`,
          retainedOf(door, life).map((y) => ({ ...y, transitions: JSON.stringify(y.transitions), blocked: JSON.stringify(y.blocked) })) as unknown as Record<string, unknown>[]
        );
      }

      const vsL0 = mode === 'L0' ? null : matchLots(r, runOf(s, 'L0').x.result);
      const vsL0Primary =
        l0Primary && mode !== 'L0' && s.role.includes(`${mode} `) && cfgId(s.cfg) !== cfgId(l0Primary.cfg)
          ? matchLots(r, runOf(l0Primary, 'L0').x.result)
          : null;

      return {
        label: s.label,
        role: s.role,
        id: cfgId(s.cfg),
        mode,
        settings: settingsOf(s.cfg, mode),
        record: rec,
        rounds: x.rounds,
        growthSims: x.growthSims,
        summary,
        funnels: Object.fromEntries(Object.entries(books).map(([b, lb]) => [b, funnelOf(lb)])),
        refusalsByOccupant: refusalsByOccupant(r),
        holding: holdingOf(door, r),
        drawdowns: drawdownEpisodes(door, r),
        lots: lotRows(door, r).length,
        versusSamePhenotypeL0: vsL0,
        versusL0Primary: vsL0Primary
      };
    })
  );

  // ----- 2. episode dependence of the principal role holders' neighbourhoods (own lifecycle, selection rep 1) -----
  const holders: { label: string; mode: Mode; cutoff: string; role: string }[] = [];

  for (const mode of modes) {
    if (sel.primary[mode]) holders.push({ label: sel.primary[mode]!, mode, cutoff: fin, role: 'final primary' });
    if (sel.independentPrimary[mode] && sel.independentPrimary[mode] !== sel.primary[mode])
      holders.push({ label: sel.independentPrimary[mode]!, mode, cutoff: fin, role: 'independent primary' });
  }

  const foldSels = Object.fromEntries(
    foldsOf(env)
      .filter((c) => c !== fin)
      .map((c) => [c, readJson<SelectionRecord>(selectionFile(env, c))])
  );

  for (const [c, fs2] of Object.entries(foldSels))
    for (const mode of modes) if (fs2.primary[mode]) holders.push({ label: fs2.primary[mode]!, mode, cutoff: c, role: 'fold primary' });

  const doors = new Map<string, Door>([[cutoffs[fin]!.door, door]]);
  const episodes = [];

  for (const h of holders) {
    const cut = cutoffs[h.cutoff]!;
    let dr = doors.get(cut.door);

    if (!dr) {
      dr = await openStudyDoor(cut.door, `${env.prefix}diagnostics episodes ${h.cutoff}`);
      doors.set(cut.door, dr);
    }

    const e = (h.cutoff === fin ? sel : foldSels[h.cutoff]!).evidence.find((x) => x.label === h.label)!;
    const o = optionsOf(e.cfg);
    const centreRun = runLife(dr, e.cfg.quad, o, h.mode);

    simulations++;

    const lead = episodesOf(centreRun.result)
      .filter((x) => x.net > 0)
      .sort((a, b) => b.net - a.net)[0];
    const draws = drawsOf(e.cfg, o, famOf('select', ['select', 1, h.cutoff], 'joint'));
    const rows = draws.map((dw) => {
      const x = runLife(dr!, dw.quad, dw.options, h.mode);

      simulations++;

      const top = episodesOf(x.result)
        .filter((y) => y.net > 0)
        .sort((a, b) => b.net - a.net)[0];
      const net = x.result.lots.reduce((a, l) => a + l.net, 0);
      const inWindow = lead
        ? x.result.lots.filter((l) => l.entryS >= lead.first && l.entryS <= lead.last).reduce((a, l) => a + l.net, 0)
        : 0;

      return {
        overlap: !!(lead && top && top.first <= lead.last && top.last >= lead.first),
        net,
        inWindowShare: net > 0 && lead ? inWindow / net : null,
        clipped: dw.clipped > 0
      };
    });
    const shares = rows
      .map((r) => r.inWindowShare)
      .filter((x): x is number => x !== null)
      .sort((a, b) => a - b);

    episodes.push({
      ...h,
      id: e.id,
      centreLeadingEpisode: lead
        ? { first: iso(dr, lead.first), last: Number.isFinite(lead.last) ? iso(dr, lead.last) : 'open', net: r2(lead.net), lots: lead.lots, shareOfCentreNet: e.centre.net > 0 ? r2(lead.net / e.centre.net) : null }
        : null,
      neighbours: rows.length,
      overlapShare: rows.length ? r2(rows.filter((r) => r.overlap).length / rows.length) : null,
      inWindowShare: shares.length
        ? { median: r2(quantile(shares, 0.5)), p10: r2(quantile(shares, 0.1)), p90: r2(quantile(shares, 0.9)), n: shares.length }
        : null,
      neighboursWithNetAtMostZero: rows.filter((r) => r.net <= 0).length,
      clippedDraws: rows.filter((r) => r.clipped).length,
      selectionFamily: { distinctLedgers: e.select.distinct, sameAsCentre: e.select.sameAsCentre, clipped: e.select.clipped, n: e.select.n }
    });
  }

  const record = {
    stage: 'diagnostics',
    door: door.name,
    selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
    mechanism,
    episodeDependence: episodes,
    files,
    simulations,
    cap: env.schedule === 'study' ? simulationCaps.diagnostics : null,
    finished: new Date().toISOString()
  };

  if (env.schedule === 'study' && simulations > simulationCaps.diagnostics)
    throw new Error(`diagnostics: ${simulations} simulations exceed the cap ${simulationCaps.diagnostics}`);
  seal(env, file, plain(record), 'diagnostics');
  log(`diagnostics: ${mechanism.length} subject-lifecycle rows, ${episodes.length} episode audits, ${simulations} simulations`);
  return record;
};

export { bookIds };
