// Stage 1 reproduction, parity gates G1–G7 and failure attribution (PROTOCOL.md §5.2, §5.3). Zero tolerance: any
// failed check is recorded and stops every dependent stage (the later stages refuse to run unless this record shows
// 0 failures).
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import {
  type Cut,
  type HistCut,
  allCuts,
  cuts,
  economics,
  freezeFile,
  histCuts,
  log,
  r2,
  repoRoot,
  stageFile
} from './context.ts';
import { assertCommitted, codeDigest, isSealed, readJson, rel, sealJson } from './records.ts';
import { readScan } from './scan.ts';
import { decode } from '../growth140-vgt-s8m/store.ts';
import { stageFile as sf } from './context.ts';
import { type SubjectKey, sources, subjectKeys, subjectSeals } from './sources.ts';
import {
  Archive,
  type Conf,
  type SealedEvidence,
  archivedRecs,
  confOfEvidence,
  detailedRun,
  eligibleSet,
  evaluateConf,
  independentSet,
  nbStats,
  openDoor,
  rolesOfSubject,
  selectionDraws,
  selectionOf,
  sliceRun
} from './subjects.ts';
import { codeDir } from './context.ts';
import { counter } from './compute.ts';

type Check = { gate: string; subject: SubjectKey | null; cut: Cut | null; what: string; ok: boolean; detail?: unknown };

const iso = (t: number) => (Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : null);
const dateOfS = (door: Door, s: number) => door.dates[s] ?? null;

// The subject's sequential transition semantics (5 bps on $100,000 per open lot closed or adopted at a switch).
export const chargePerLot = (economics.costBps / 10_000) * economics.budget;

export interface SliceOutcome {
  label: string;
  id: string;
  sliceNet: number;
  sliceDd: number;
  boundaryEquity: number;
  wholeNet: number;
  wholeDd: number;
  openAtBoundary: string[];
  openAtEnd: string[];
  t: number[];
  v: number[];
}

export const sequentialOf = (parts: { fold: HistCut; o: SliceOutcome | null }[]) => {
  const slices: { t: number[]; v: number[]; charge: number }[] = [];
  const rows: { fold: HistCut; label: string | null; sliceNet: number; sliceDd: number; charge: number }[] = [];
  let prev: { id: string; openAtEnd: number } | null = null;
  let charges = 0;

  for (const { fold, o } of parts) {
    let ch = 0;

    if (o && prev && prev.id !== o.id) ch = chargePerLot * (prev.openAtEnd + o.openAtBoundary.length);
    if (!o && prev) ch = chargePerLot * prev.openAtEnd;
    charges += ch;
    slices.push({ t: o?.t ?? [], v: o?.v ?? [], charge: ch });
    rows.push({ fold, label: o?.label ?? null, sliceNet: o?.sliceNet ?? 0, sliceDd: o?.sliceDd ?? 0, charge: ch });
    prev = o ? { id: o.id, openAtEnd: o.openAtEnd.length } : null;
  }

  const dd = sequentialDrawdown(slices, 0);

  return {
    parts: rows,
    netBeforeCharges: r2(rows.reduce((a, p) => a + p.sliceNet, 0)),
    charges: r2(charges),
    net: r2(rows.reduce((a, p) => a + p.sliceNet, 0) - charges),
    sequentialDd: r2(dd.maximum),
    ddPeak: iso(dd.peakTime),
    ddTrough: iso(dd.troughTime),
    ddRecovery: iso(dd.recoveryTime),
    peakT: dd.peakTime,
    troughT: dd.troughTime,
    withinCeiling: dd.maximum <= economics.ceiling
  };
};

const sliceTracker = (t: number[], v: number[]) => {
  const tr = new Tracker(0, t[0] ?? 0);

  for (let i = 0; i < t.length; i++) tr.updateStrict(v[i]!, t[i]!);
  return tr.stats();
};

// The funded lots of a detailed run that touch the slice after boundary index b, with the slice exposure.
export const sliceLedger = (door: Door, x: ReturnType<typeof detailedRun>['x'], b: number) => {
  const r = x.result;
  const lots = r.lots
    .filter((l) => l.open || l.fills.at(-1)!.s > b)
    .map((l) => ({
      book: l.book,
      entry: dateOfS(door, l.entryS),
      entryT: l.entryT,
      exit: l.open ? null : dateOfS(door, l.fills.at(-1)!.s),
      exitT: l.open ? null : l.fills.at(-1)!.t,
      heldSessions: (l.open ? r.endIndex : l.fills.at(-1)!.s) - l.entryS,
      carriedIn: l.entryS <= b,
      partials: l.fills.filter((f) => f.partial).length,
      net: r2(l.net),
      costs: r2(l.costs),
      interest: r2(l.interest),
      open: l.open
    }));
  let held = 0;

  for (let s = b + 1; s <= r.endIndex; s++) if (r.heldAtClose[s]! >= 0) held++;

  return { lots, sessions: r.endIndex - b, heldSessions: held, exposure: r2(held / Math.max(1, r.endIndex - b)) };
};

const lotsBetween = (lots: ReturnType<typeof sliceLedger>['lots'], from: number, to: number) =>
  lots.filter((l) => l.entryT <= to && (l.exitT === null || l.exitT >= from)).map((l) => `${l.book} ${l.entry}→${l.exit ?? 'open'} ${l.net}`);

export const runReproduce = async () => {
  const cnt = counter('stage1 reproduce');

  assertCommitted(freezeFile);
  if (fs.existsSync(stageFile.reproduction)) throw new Error(`${rel(stageFile.reproduction)} is sealed`);

  const checks: Check[] = [];
  const add = (c: Check) => {
    checks.push(c);
    if (!c.ok) log(`CHECK FAILED ${c.gate} ${c.subject ?? ''} ${c.cut ?? ''}: ${c.what} ${JSON.stringify(c.detail ?? '').slice(0, 300)}`);
  };

  // ----- G1: the subjects' seals and preflights -----
  for (const s of subjectKeys) {
    const seals = subjectSeals(sources[s]);
    const bad = seals.records.filter((r) => !r.verified || !isSealed(path.join(repoRoot, r.file)));

    add({ gate: 'G1', subject: s, cut: null, what: `${seals.records.length} sealed records re-hash and are read-only`, ok: bad.length === 0, detail: bad.map((b) => b.file) });

    let pre = 'pass';

    try {
      requireStandardAdoption(sources[s].researchDir, { repoRoot });
    } catch (e) {
      pre = (e as Error).message;
    }

    add({ gate: 'G1', subject: s, cut: null, what: 'preflight', ok: pre === 'pass', detail: pre });
  }

  // ----- G2: roles re-derived from sealed evidence -----
  for (const s of subjectKeys)
    for (const cut of allCuts) {
      const sel = selectionOf(s, cut);
      const sets: [string, SealedEvidence[]][] = [['independent', independentSet(s, cut)]];

      if (cut === 'C24') sets.push(['final', sel.evidence.filter((e) => e.selectable)]);
      for (const [name, ev] of sets) {
        const r = rolesOfSubject(s, name, ev) as unknown as { roles: Record<string, string | null>; ranked: { label: string }[]; qualified: number };
        const sealed = sel.roles[name]!;
        const same =
          JSON.stringify(r.roles) === JSON.stringify(sealed.roles) &&
          JSON.stringify(r.ranked.map((x) => x.label)) === JSON.stringify(sealed.ranked.map((x) => x.label)) &&
          r.qualified === sealed.qualified;

        add({ gate: 'G2', subject: s, cut, what: `roles of the ${name} set (${r.qualified} qualified)`, ok: same, detail: same ? r.roles : { mine: r.roles, sealed: sealed.roles } });
      }

      const primary = cut === 'C24' && s === '4A' ? sel.independentPrimary : sel.roles.independent!.roles['actual-profit'];

      add({ gate: 'G2', subject: s, cut, what: 'independent primary', ok: primary === sel.roles.independent!.roles['actual-profit'], detail: primary });
    }

  // ----- G3: selection-family statistics from archive hits -----
  const g3keys = ['n', 'median', 'p10', 'robust', 'p90Dd', 'breaches', 'worstDd', 'distinct', 'sameAsCentre', 'clipped'] as const;

  for (const s of subjectKeys)
    for (const cut of allCuts) {
      const arc = new Archive(sources[s].qualifyJob(cut));
      let ok = 0;
      const bad: unknown[] = [];

      for (const e of eligibleSet(s, cut)) {
        const c = confOfEvidence(s, e);
        const draws = selectionDraws(c, cut);
        const recs = archivedRecs(arc, cuts[cut].door, draws);

        if (!recs) {
          bad.push({ label: e.label, missing: true });
          continue;
        }

        const nb = nbStats(e.centre, recs, draws.map((d) => d.clipped));
        const diff = g3keys.filter((k) => nb[k] !== (e.select as unknown as Record<string, number>)[k]);

        if (diff.length) bad.push({ label: e.label, diff });
        else ok++;
      }

      cnt.hits('selection draws (G3)', arc.reads);
      arc.close();
      add({ gate: 'G3', subject: s, cut, what: `selection statistics of ${ok + bad.length} eligible members from ${''}archive hits`, ok: bad.length === 0, detail: bad });
    }

  // ----- G4: fresh centre reruns on the training doors -----
  const g4keys = ['net', 'realized', 'unrealized', 'dd', 'ddPeakT', 'ddTroughT', 'lots', 'wins', 'losses', 'signature', 'topEpisode', 'episodes'] as const;

  for (const cut of allCuts) {
    const door = await openDoor(cuts[cut].door, `stage1 G4 centre reruns ${cut} (training door)`);

    for (const s of subjectKeys) {
      const bad: unknown[] = [];
      let n = 0;

      for (const e of eligibleSet(s, cut)) {
        const rec = evaluateConf(door, confOfEvidence(s, e));

        cnt.fresh('training centre (G4)');
        n++;

        const diff = g4keys.filter((k) => (rec as unknown as Record<string, unknown>)[k] !== (e.centre as unknown as Record<string, unknown>)[k]);

        if (diff.length) bad.push({ label: e.label, diff });
      }

      add({ gate: 'G4', subject: s, cut, what: `${n} eligible centres rerun on ${cuts[cut].door}`, ok: bad.length === 0, detail: bad });
    }
  }

  // ----- G5 / G6 / attribution: published fold role holders -----
  type Holder = { s: SubjectKey; cut: HistCut; label: string; roles: string[]; e: SealedEvidence; c: Conf };
  const holders: Holder[] = [];

  for (const s of subjectKeys)
    for (const cut of histCuts) {
      const sel = selectionOf(s, cut);

      for (const [role, label] of Object.entries(sel.roles.independent!.roles)) {
        if (!label) continue;

        const h = holders.find((x) => x.s === s && x.cut === cut && x.label === label);

        if (h) h.roles.push(role);
        else {
          const e = sel.evidence.find((x) => x.label === label)!;

          holders.push({ s, cut, label, roles: [role], e, c: confOfEvidence(s, e) });
        }
      }
    }

  const outcomes = new Map<string, SliceOutcome>();
  const attribution: unknown[] = [];

  for (const cut of histCuts) {
    const spec = cuts[cut];
    const train = await openDoor(spec.door, `stage1 G6 training-door runs of the published ${cut} role holders`);
    const next = await openDoor(spec.evalDoor, `stage1 G5/G6 reproduction of the published ${cut} role holders (outcomes already sealed by the subjects)`);
    const b = next.dates.indexOf(spec.end);

    if (b < 0 || train.dates.at(-1) !== spec.end) throw new Error(`${cut}: boundary ${spec.end} not found`);

    for (const h of holders.filter((x) => x.cut === cut)) {
      const ev = readJson<{ rows: { label: string; sliceNet: number; sliceDd: number; boundaryEquity: number; wholeNet: number; wholeDd: number }[] }>(sources[h.s].evaluationRecord(cut));
      const sealedRow = ev.rows.find((r) => r.label === h.label)!;
      const x = sliceRun(next, h.c, spec.end);

      cnt.fresh('next-slice reproduction (G5)', true);

      const o: SliceOutcome = {
        label: h.label,
        id: h.c.id,
        sliceNet: x.rec.periods[0]!.after,
        sliceDd: x.rec.periods[0]!.dd,
        boundaryEquity: x.rec.periods[0]!.equity,
        wholeNet: x.rec.net,
        wholeDd: x.rec.dd,
        openAtBoundary: x.openAtBoundary,
        openAtEnd: x.openAtEnd,
        t: x.t,
        v: x.v
      };

      outcomes.set(`${h.s}|${cut}|${h.label}`, o);

      const g5diff = (['sliceNet', 'sliceDd', 'boundaryEquity', 'wholeNet', 'wholeDd'] as const).filter((k) => o[k] !== sealedRow[k]);

      add({ gate: 'G5', subject: h.s, cut, what: `fold outcome of ${h.label}`, ok: g5diff.length === 0, detail: g5diff.map((k) => `${k} ${o[k]} vs ${sealedRow[k]}`) });

      // G6: causal prefix (training door vs next-slice door through the cutoff)
      const tr = detailedRun(train, h.c);
      const nx = detailedRun(next, h.c, { boundaries: [spec.end] });

      cnt.fresh('training detailed (G6)');
      cnt.fresh('next-slice detailed (G6, attribution)', true);

      let dailyEq = true;

      for (let s2 = 0; s2 <= b; s2++) {
        const a = tr.x.result.daily[s2]!;
        const c2 = nx.x.result.daily[s2]!;

        if (!(Object.is(a, c2) || (Number.isNaN(a) && Number.isNaN(c2)))) {
          dailyEq = false;
          break;
        }
      }

      const sig = (lots: typeof tr.x.result.lots) =>
        lots
          .filter((l) => l.entryS <= b)
          .map((l) => `${l.book},${l.entryT},${Math.round(l.principal0 * 100)},${l.fills.filter((f) => f.s <= b).map((f) => `${f.t}:${f.partial ? 'p' : 'f'}`).join('/')}`)
          .join(';');

      add({ gate: 'G6', subject: h.s, cut, what: `causal prefix of ${h.label}`, ok: dailyEq && sig(tr.x.result.lots) === sig(nx.x.result.lots) && tr.rec.net === nx.rec.periods[0]!.equity, detail: { dailyEq } });

      // attribution (PROTOCOL.md §5.3)
      const led = sliceLedger(next, nx.x, b);
      const st = sliceTracker(o.t, o.v);

      attribution.push({
        subject: h.s,
        cut,
        label: h.label,
        roles: h.roles,
        id: h.c.id,
        cell: h.c.cell,
        training: {
          net: h.e.centre.net,
          dd: h.e.centre.dd,
          lots: h.e.centre.lots,
          episodes: h.e.centre.episodes,
          topEpisode: h.e.centre.topEpisode,
          topEpisodeShare: h.e.centre.topEpisodeShare,
          years: h.e.centre.years,
          selectRobust: h.e.select.robust,
          selectP90Dd: h.e.select.p90Dd,
          confirmP10: h.e.confirm.p10,
          confirmP90Dd: h.e.confirm.p90Dd
        },
        slice: {
          net: o.sliceNet,
          dd: o.sliceDd,
          ddPeak: iso(st.peakTime),
          ddTrough: iso(st.troughTime),
          ddRecovery: iso(st.recoveryTime),
          openBetweenPeakAndTrough: lotsBetween(led.lots, st.peakTime, st.troughTime),
          exposure: led.exposure,
          heldSessions: led.heldSessions,
          sessions: led.sessions,
          lots: led.lots,
          costs: r2(led.lots.reduce((a, l) => a + l.costs, 0)),
          interest: r2(led.lots.reduce((a, l) => a + l.interest, 0)),
          openAtBoundary: o.openAtBoundary,
          openAtEnd: o.openAtEnd
        }
      });
    }
  }

  // G5 (sequential): the procedure and every role, recomputed from the reruns
  const sequential: unknown[] = [];

  for (const s of subjectKeys) {
    const sealed = readJson<{ policies: { name: string; net: number; charges: number; sequentialDd: number; ddPeak: string; ddTrough: string }[] }>(sources[s].sequentialRecord);
    const roleOf = (cut: HistCut, role: string) => selectionOf(s, cut).roles.independent!.roles[role] ?? null;
    const names: [string, string][] = [
      ['actual-profit', s === '3B' ? 'independent procedure (each fold primary; flat without one)' : 'independent procedure (each fold primary = the independent actual-profit holder)'],
      ['robust-profit', s === '3B' ? 'role robust-profit' : 'independent role robust-profit'],
      ['balanced', s === '3B' ? 'role balanced' : 'independent role balanced'],
      ['lower-drawdown', s === '3B' ? 'role lower-drawdown' : 'independent role lower-drawdown']
    ];

    for (const [role, name] of names) {
      const seq = sequentialOf(
        histCuts.map((fold) => {
          const label = roleOf(fold, role);

          return { fold, o: label ? outcomes.get(`${s}|${fold}|${label}`)! : null };
        })
      );
      const sp = sealed.policies.find((p) => p.name === name)!;
      const fmt = (x: string | null) => (x ?? '').replace(':00.000Z', 'Z');
      const same = seq.net === sp.net && seq.charges === sp.charges && seq.sequentialDd === sp.sequentialDd && fmt(seq.ddPeak) === sp.ddPeak && fmt(seq.ddTrough) === sp.ddTrough;

      add({ gate: 'G5', subject: s, cut: null, what: `sequential ${name}`, ok: same, detail: same ? null : { mine: { net: seq.net, charges: seq.charges, dd: seq.sequentialDd, peak: seq.ddPeak, trough: seq.ddTrough }, sealed: sp } });

      // the positions open between the sequential peak and trough
      const fold = histCuts.find((f) => {
        const label = roleOf(f, role);
        const o = label ? outcomes.get(`${s}|${f}|${label}`) : null;

        return o && o.t.length && o.t[0]! <= seq.troughT && o.t.at(-1)! >= seq.troughT;
      });

      sequential.push({ subject: s, policy: `P0 role ${role}`, sealedName: name, ...seq, troughFold: fold ?? null });
    }
  }

  // ----- G7: rung-1 reconstruction against the sealed lane summaries -----
  for (const c of g7Checks()) add(c);

  const failed = checks.filter((c) => !c.ok);
  const record = {
    stage: 'stage1 reproduction and parity (G1–G7) with failure attribution',
    failed: failed.length,
    checks,
    attribution,
    sequential,
    compute: cnt.done(),
    code: codeDigest(codeDir).digest,
    subjectDigests: Object.fromEntries(subjectKeys.map((s) => [s, sources[s].evaluationDigest()])),
    finished: new Date().toISOString()
  };

  sealJson(stageFile.reproduction, record, 'stage1 reproduction');
  log(`stage1 reproduction: ${checks.length} checks, ${failed.length} failed`);
  return record;
};

// G7 (amendment A1): the sealed lane summaries are read with the subjects' store decoding, so their non-finite
// robust / p90 values ("__-Inf" / "__Inf") compare with the reconstruction's −∞ / +∞ (unmeasured neighbourhoods).
export const g7Checks = (): Check[] => {
  const out: Check[] = [];

  for (const s of subjectKeys)
    for (const cut of histCuts) {
      const scan = new Map(readScan(s, cut).map((r) => [r.id, r]));
      const rec = decode<{ lanes: { key: string; topByNet: { id: string; net: number; robust: number; p90: number; feasible: boolean }[]; frontier: { id: string; net: number; robust: number; p90: number }[] }[] }>(
        fs.readFileSync(sources[s].searchRecord(cut), 'utf8')
      );
      let n = 0;
      const bad: unknown[] = [];

      for (const lane of rec.lanes)
        for (const x of [...lane.topByNet, ...lane.frontier]) {
          const r = scan.get(x.id);

          n++;
          if (!r) {
            bad.push({ id: x.id, missing: true });
            continue;
          }

          const robust = r.nb?.robust ?? -Infinity;
          const p90 = r.nb?.p90Dd ?? Infinity;
          const okRow = r.net === x.net && robust === x.robust && p90 === x.p90 && ('feasible' in x ? r.feasible === x.feasible : r.feasible);

          if (!okRow) bad.push({ lane: lane.key, id: x.id, mine: { net: r.net, robust, p90, feasible: r.feasible }, sealed: x });
        }

      out.push({ gate: 'G7', subject: s, cut, what: `${n} sealed topByNet/frontier entries against the reconstructed rung-1 fits (decoded)`, ok: bad.length === 0, detail: bad.slice(0, 20) });
    }

  return out;
};

export const g7RecheckFile = path.join(path.dirname(sf.reproduction), 'g7-recheck.json');

export const runG7Recheck = () => {
  assertCommitted(sf.reproduction);
  if (fs.existsSync(g7RecheckFile)) throw new Error('the G7 recheck is sealed');

  const checks = g7Checks();
  const record = {
    stage: 'stage1 G7 recheck (amendment A1): archive scan only, no fresh simulation',
    amends: { file: rel(sf.reproduction), failedThere: readJson<{ checks: Check[] }>(sf.reproduction).checks.filter((c) => !c.ok).map((c) => `${c.gate} ${c.subject} ${c.cut}`) },
    failed: checks.filter((c) => !c.ok).length,
    checks,
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(g7RecheckFile, record, 'stage1 G7 recheck (A1)');
  log(`G7 recheck: ${checks.length} checks, ${record.failed} failed`);
  return record;
};

// Every parity gate passed: reproduction.json with 0 failures, or (amendment A1) every failure there is a G7 check
// and the sealed, committed G7 recheck has 0 failures.
export const assertParity = () => {
  assertCommitted(sf.reproduction);

  const rep = readJson<{ checks: Check[] }>(sf.reproduction);
  const failed = rep.checks.filter((c) => !c.ok);

  if (failed.length === 0) return;
  if (failed.some((c) => c.gate !== 'G7')) throw new Error('a parity gate failed: every dependent stage is blocked');
  assertCommitted(g7RecheckFile);
  if (readJson<{ failed: number }>(g7RecheckFile).failed !== 0) throw new Error('the G7 recheck failed: dependent stages are blocked');
};
