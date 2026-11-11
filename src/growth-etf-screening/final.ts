// The final cutoff (PROTOCOL.md §9, §11): the C24 selection with the frozen ETF-shortlisting rule, the report-only
// diagnostics, the frozen selection (sealed and committed before FULL opens) and the one-time validation.
//
// THE ETF-SHORTLISTING RULE (frozen; development results only; at most three NEW ETFs; controls VGT and GDX never count):
//   Tier 1: a non-control ETF with ≥ 1 qualified C24 independent member AND a SUPPORTED own procedure (its C19/C21/C23
//           fold primaries' sequential path 2020–2024: every fold produced a primary, net > 0, minute DD ≤ $35,000).
//   Tier 2: a non-control ETF with ≥ 1 qualified C24 independent member whose own procedure is UNSUPPORTED.
//   Order (both tiers): the sum of two ranks among all such ETFs — P = the C24 actual-profit holder's centre net and R =
//   the C24 robust-profit holder's selection robust net (1 = highest) — ties by P, then the symbol.
//   The shortlist: Tier 1 in that order, at most ONE ETF per exposure cluster (Study 9's clusters), at most three; a
//   Tier-1 ETF skipped for its cluster is a "close substitute" of the cluster's pick. Near misses (≤ 3): the remaining
//   Tier-1 ETFs in order, then Tier 2 in order. No Tier-1 ETF → no shortlist (a valid outcome).
// FUTILITY (frozen): if no member of any ETF qualifies at C24 (independent or transfer), the study stops without
// validation.
import fs from 'node:fs';
import path from 'node:path';
import { episodesOf, evaluate, run } from '../vg-d1-growth-joint/evaluate.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import {
  cacheRoot,
  chronology,
  cutoffs,
  economics,
  frozenSelectionFile,
  log,
  r2,
  repoRoot,
  resultsDir
} from './context.ts';
import { type EtfDoor, doorName, openEtfDoor } from './doors.ts';
import { sequentialFile, sliceRun } from './folds.ts';
import { withLab } from './lab.ts';
import { addToLedger } from './ledger.ts';
import { type Evidence, type Member, type Roles, qualifyMembers, recSummary, rolesOf, summary } from './qualify.ts';
import { fidelities } from './qualify.ts';
import { isSealed, readJson, rel, sealJson, sha256File, usd } from './records.ts';
import { type GConfig, build, rowsOf, toggles } from './space.ts';
import {
  type Env,
  type ScreenRecord,
  loadScreens,
  seal,
  selectionOfScreens,
  studyGuards,
  symbolsOf
} from './stages.ts';
import { transferFile, transferVectors } from './transfer.ts';
import { clusterOf, isControl } from './universe.ts';
import { plausible, quantile } from './fitness.ts';

export const finalSelectionFile = (env: Env) => path.join(env.outDir, 'final', 'selection-C24.json');
export const diagnosticsFile = (env: Env) => path.join(env.outDir, 'final', 'diagnostics.json');
export const validationFile = (env: Env) => path.join(env.outDir, 'validation', 'validation.json');
const finalCut = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');

type Summary = ReturnType<typeof summary>;
interface TransferRecord {
  sym: string;
  roles: Roles;
  summary: Summary[];
  evidence: Evidence[];
  centres: { key: string; label: string; id: string; net: number; dd: number; lots: number; plausible: boolean }[];
}
interface SeqPolicy {
  name: string;
  sym?: string;
  net: number;
  sequentialDd: number;
  verdict: string;
  supported: boolean;
  parts: {
    fold: string;
    label: string | null;
    sym: string | null;
    sliceNet: number;
    sliceDd: number;
    charge: number;
  }[];
}

// ----- the C24 selection and the shortlist -----

export interface RuleRow {
  sym: string;
  cluster: string;
  control: boolean;
  qualified: number;
  P: number | null;
  R: number | null;
  chronology: { supported: boolean; verdict: string } | null;
}

// The frozen ETF-shortlisting rule (pure; PROTOCOL.md §9.5).
export const shortlistRule = <T extends RuleRow>(rows: readonly T[]) => {
  const ranked = rows.filter((r) => !r.control && r.qualified > 0);
  const rankBy = (k: 'P' | 'R') => {
    const order = [...ranked].sort((a, b) => (b[k] ?? -Infinity) - (a[k] ?? -Infinity) || (a.sym < b.sym ? -1 : 1));

    return new Map(order.map((r, i) => [r.sym, i + 1]));
  };
  const rp = rankBy('P');
  const rr = rankBy('R');
  const ordered = [...ranked]
    .map((r) => ({ ...r, rankP: rp.get(r.sym)!, rankR: rr.get(r.sym)!, rankSum: rp.get(r.sym)! + rr.get(r.sym)! }))
    .sort((a, b) => a.rankSum - b.rankSum || (b.P ?? 0) - (a.P ?? 0) || (a.sym < b.sym ? -1 : 1));
  const tier1 = ordered.filter((r) => r.chronology?.supported);
  const tier2 = ordered.filter((r) => !r.chronology?.supported);
  const shortlist: (typeof ordered)[number][] = [];
  const substitutes: { sym: string; substituteOf: string; cluster: string }[] = [];

  for (const r of tier1) {
    const same = shortlist.find((s) => s.cluster === r.cluster);

    if (same) substitutes.push({ sym: r.sym, substituteOf: same.sym, cluster: r.cluster });
    else if (shortlist.length < 3) shortlist.push(r);
  }

  const nearMisses = [...tier1.filter((r) => !shortlist.includes(r)), ...tier2].slice(0, 3);

  return { ordered, shortlist, substitutes, nearMisses };
};

export const runFinalSelect = async (env: Env) => {
  const file = finalSelectionFile(env);
  const cut = finalCut(env);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  if (env.schedule === 'study' && !isSealed(sequentialFile(env)))
    throw new Error('the sequential record is not sealed');

  const screens = loadScreens(env, cut);
  const sel = selectionOfScreens(screens);
  const seq = fs.existsSync(sequentialFile(env))
    ? readJson<{ perEtf: SeqPolicy[]; universe: SeqPolicy; new: SeqPolicy }>(sequentialFile(env))
    : null;
  const transfers = new Map(
    symbolsOf(env).map((s) => {
      const f = transferFile(env, s);

      if (!isSealed(f)) throw new Error(`the transfer record of ${s} is not sealed`);
      return [s, readJson<TransferRecord>(f)];
    })
  );
  const rec = new Map(screens.map((s) => [s.record.sym, s.record]));
  const sumOf = (r: ScreenRecord, label: string | null) =>
    label ? (r.summary.find((x) => x.label === label) ?? null) : null;
  const rows = symbolsOf(env).map((sym) => {
    const r = rec.get(sym)!;
    const t = transfers.get(sym)!;
    const chrono = seq?.perEtf.find((p) => p.sym === sym) ?? null;
    const ap = sumOf(r, r.roles.roles['actual-profit']);
    const rp = sumOf(r, r.roles.roles['robust-profit']);
    const bestTransfer = t.roles.roles['actual-profit']
      ? (t.summary.find((x) => x.label === t.roles.roles['actual-profit']) ?? null)
      : null;

    return {
      sym,
      cluster: clusterOf(sym),
      control: isControl(sym),
      qualified: r.roles.qualified,
      roles: r.roles.roles,
      actualProfit: ap,
      robustProfit: rp,
      P: ap?.net ?? null,
      R: rp?.selectRobust ?? null,
      chronology: chrono
        ? {
            verdict: chrono.verdict,
            supported: chrono.supported,
            net: chrono.net,
            dd: chrono.sequentialDd,
            parts: chrono.parts
          }
        : null,
      transfer: {
        qualified: t.roles.qualified,
        best: bestTransfer,
        plausibleCentres: t.centres.filter((c) => c.plausible).length,
        roles: t.roles.roles
      },
      bestDevelopmentNet: Math.max(-Infinity, ...r.summary.map((x) => x.net))
    };
  });
  const { ordered, shortlist, substitutes, nearMisses } = shortlistRule(rows);
  const anyQualified = rows.some((r) => r.qualified > 0) || rows.some((r) => r.transfer.qualified > 0);
  const record = {
    stage: 'final selection (C24)',
    cutoff: cut,
    schedule: env.schedule,
    rule: 'Tier 1 = a non-control ETF with ≥ 1 qualified C24 independent member and a SUPPORTED own procedure; order by rank(P) + rank(R), ties P then symbol; ≤ 1 per cluster; ≤ 3. Near misses: remaining Tier 1, then Tier 2 (qualified, own procedure unsupported).',
    universe: sel.universe,
    new: sel.new,
    primary: sel.universe.roles['actual-profit'],
    primaryNew: sel.new.roles['actual-profit'],
    shortlist: shortlist.map((r) => r.sym),
    substitutes,
    nearMisses: nearMisses.map((r) => ({
      sym: r.sym,
      tier: r.chronology?.supported ? 1 : 2,
      reason: r.chronology?.supported
        ? 'Tier 1 beyond the shortlist (cluster or count)'
        : `own procedure ${r.chronology?.verdict ?? 'not evaluated'}`
    })),
    ordered: ordered.map((r) => ({
      sym: r.sym,
      cluster: r.cluster,
      tier: r.chronology?.supported ? 1 : 2,
      P: r.P,
      R: r.R,
      rankP: r.rankP,
      rankR: r.rankR,
      rankSum: r.rankSum,
      chronology: r.chronology?.verdict ?? null
    })),
    rows,
    futility: !anyQualified,
    universeProcedure: seq?.universe ?? null,
    newProcedure: seq?.new ?? null,
    sources: {
      screens: screens.map((s) => ({ file: rel(s.file), sha256: sha256File(s.file) })),
      transfers: symbolsOf(env).map((s) => ({
        file: rel(transferFile(env, s)),
        sha256: sha256File(transferFile(env, s))
      })),
      sequential: seq ? { file: rel(sequentialFile(env)), sha256: sha256File(sequentialFile(env)) } : null
    },
    finished: new Date().toISOString()
  };

  seal(env, file, record, 'final selection C24');
  log(
    `final selection: shortlist ${record.shortlist.join(', ') || 'none'}; near misses ${record.nearMisses.map((x) => x.sym).join(', ') || 'none'}; universe primary ${record.primary ?? 'none'}`
  );
  return record;
};

// ----- the subjects of the diagnostics, the frozen selection and the validation -----

export interface Subject {
  label: string;
  sym: string;
  kind: 'independent' | 'transfer';
  why: string[];
  id: string;
  g: GConfig;
  development: Summary;
}

export const subjectsOf = (env: Env) => {
  const fsel = readJson<Awaited<ReturnType<typeof runFinalSelect>>>(finalSelectionFile(env));
  const cut = finalCut(env);
  const out: Subject[] = [];
  const evidenceOf = (sym: string) => readJson<ScreenRecord>(path.join(env.outDir, 'qualify', cut, `${sym}.json`));
  const add = (sym: string, label: string | null, why: string, kind: 'independent' | 'transfer' = 'independent') => {
    if (!label) return;

    const x = out.find((s) => s.label === label);

    if (x) {
      if (!x.why.includes(why)) x.why.push(why);
      return;
    }

    const recd = kind === 'independent' ? evidenceOf(sym) : readJson<TransferRecord>(transferFile(env, sym));
    const e = (recd.evidence as unknown as Evidence[]).find((v) => v.label === label)!;
    const s = (recd.summary as Summary[]).find((v) => v.label === label)!;

    out.push({ label, sym, kind, why: [why], id: e.id, g: e.g!, development: s });
  };
  const symOfLabel = (label: string) => label.split('/')[1]!.split('#')[0]!;

  for (const [role, label] of Object.entries(fsel.universe.roles))
    if (label) add(symOfLabel(label), label, `universe ${role}`);
  for (const sym of fsel.shortlist) {
    const r = fsel.rows.find((x) => x.sym === sym)!;

    for (const [role, label] of Object.entries(r.roles)) add(sym, label, `shortlist ${sym} ${role}`);
    add(sym, r.transfer.roles['actual-profit'], `shortlist ${sym} transfer actual-profit (informed)`, 'transfer');
  }
  for (const n of fsel.nearMisses)
    add(n.sym, fsel.rows.find((x) => x.sym === n.sym)!.roles['actual-profit'], `near miss ${n.sym} actual-profit`);
  for (const sym of ['VGT', 'GDX'].filter((s) => symbolsOf(env).includes(s))) {
    const r = fsel.rows.find((x) => x.sym === sym)!;

    add(sym, r.roles['actual-profit'], `control ${sym} independent actual-profit`);
  }
  return { fsel, subjects: out.filter((s) => s.sym) };
};

// ----- report-only diagnostics (development D24; sealed before the frozen selection) -----

// The buy-and-hold reference of one ETF on a door (report-only; never a gate): $100,000 bought at the first session's
// opening trade after 5 bps, held to the door's end, marked at every regular-session minute close; the financed
// variant charges 11% simple interest on the $100,000 by calendar day (the Growth book's financing); the unlevered
// variant charges none. Price only.
export const buyAndHold = (d: EtfDoor, fromIndex = 0, boundary?: string) => {
  const ses = d.sessions;
  const first = ses[fromIndex]!;
  const entry = first.bars[0]!.open * (1 + economics.costBps / 10000);
  const shares = economics.budget / entry;
  const t0 = first.openTime;
  const variants = { financed: economics.rate, unlevered: 0 };
  const out: Record<
    string,
    { net: number; dd: number; boundaryNet?: number; afterBoundary?: number; resetDd?: number }
  > = {};

  for (const [name, rate] of Object.entries(variants)) {
    const tr = new Tracker(0, t0);
    let reset: Tracker | null = null;
    let atBoundary = NaN;
    let last = 0;

    for (let s = fromIndex; s < ses.length; s++) {
      const x = ses[s]!;
      const days = Math.max(
        0,
        Math.round((Date.parse(`${x.date}T00:00:00Z`) - Date.parse(`${first.date}T00:00:00Z`)) / 86400000)
      );
      const interest = economics.budget * rate * (days / 365);

      for (const b of x.bars) {
        last = shares * b.close - economics.budget - interest;
        tr.updateStrict(last, b.time);
        reset?.updateStrict(last, b.time);
      }
      if (boundary && x.date === boundary) {
        atBoundary = last;
        reset = new Tracker(last, x.closeTime);
      }
    }

    out[name] = {
      net: r2(last - shares * ses.at(-1)!.close * (economics.costBps / 10000)),
      dd: r2(tr.stats().maximum),
      ...(boundary
        ? {
            boundaryNet: r2(atBoundary),
            afterBoundary: r2(last - atBoundary),
            resetDd: r2(reset?.stats().maximum ?? 0)
          }
        : {})
    };
  }
  return out;
};

const ledgerCsvFiles = {
  'L0 primary (5B)':
    'research/vg-lifecycle-matched-optimization/results/diagnostics/ledgers/C24_L0_informed_R1#1_profit/L0/lots.csv',
  'C4-refined': 'research/vg-lifecycle-matched-optimization/results/diagnostics/ledgers/control_C4R/L0/lots.csv',
  C4: 'research/vg-lifecycle-matched-optimization/results/diagnostics/ledgers/control_C4/L0/lots.csv'
};

// Busy days (any lot held) of the known portfolios' frozen development ledgers.
const portfolioBusy = () => {
  const out: Record<string, { file: string; sha256: string; days: Set<string>; growthDays: Set<string> }> = {};

  for (const [name, f] of Object.entries(ledgerCsvFiles)) {
    const file = path.join(repoRoot, f);
    const text = fs.readFileSync(file, 'utf8').trim().split('\n').slice(1);
    const days = new Set<string>();
    const growthDays = new Set<string>();

    for (const line of text) {
      const entry = /,(\d{4}-\d{2}-\d{2}),/.exec(line)?.[1];
      const exits = [...line.matchAll(/""date"":""(\d{4}-\d{2}-\d{2})""/g)].map((m) => m[1]!);
      const end = exits.at(-1) ?? '2024-12-31';
      const growth = line.split(',')[1]!.startsWith('G:');

      if (!entry) continue;
      for (let t = Date.parse(`${entry}T00:00:00Z`); t <= Date.parse(`${end}T00:00:00Z`); t += 86400000) {
        const d = new Date(t).toISOString().slice(0, 10);

        days.add(d);
        if (growth) growthDays.add(d);
      }
    }
    out[name] = { file: f, sha256: sha256File(file), days, growthDays };
  }
  return out;
};

export const runDiagnostics = async (env: Env) => {
  const file = diagnosticsFile(env);
  const cut = finalCut(env);
  const c = cutoffs[cut]!;

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  if (!isSealed(finalSelectionFile(env))) throw new Error('the final selection is not sealed');

  const { fsel, subjects } = subjectsOf(env);
  const fid = fidelities[env.schedule];
  const busy = portfolioBusy();
  const t1 = transferVectors().find((v) => v.key === 'T1')!.g;
  const t2 = transferVectors().find((v) => v.key === 'T2')!.g;
  const vgtDoor = await openEtfDoor('VGT', c.door, `${env.prefix}diagnostics (VGT Growth references)`);
  const heldDays = (d: EtfDoor, g: GConfig) => {
    const b = build(g);
    const x = run(d.door, b.quad, b.options, true).result;
    const days = new Set<string>();

    for (const l of x.lots)
      for (let s = l.entryS; s <= (l.open ? d.door.sessions - 1 : l.fills.at(-1)!.s); s++) days.add(d.door.dates[s]!);
    return { days, x };
  };
  const vgtRefs = {
    'VGT Growth #4 (standalone)': heldDays(vgtDoor, t1).days,
    'VGT Growth 08500a60 (standalone)': heldDays(vgtDoor, t2).days
  };
  const rows: Record<string, unknown>[] = [];
  let sims = 2;
  const bySym = new Map<string, Subject[]>();

  for (const s of subjects) bySym.set(s.sym, [...(bySym.get(s.sym) ?? []), s]);

  // the small and wide families (workers; one job per ETF)
  const radius = new Map<string, Evidence>();

  for (const [sym, ss] of bySym) {
    const job = `${env.prefix}diagnostics-${cut}-${sym}`;

    await withLab(
      {
        job,
        door: doorName(sym, c.door),
        purpose: `${env.prefix}diagnostics ${sym}`,
        workers: Math.min(env.workers, 8),
        ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {})
      },
      async (lab) => {
        const members: Member[] = ss.map((s) => ({
          label: s.label,
          sym,
          kind: s.kind,
          lane: '',
          origin: '',
          pick: '',
          g: s.g
        }));
        const ev = await qualifyMembers(
          lab,
          members.map((m) => ({ m, confirm: false, radius: true })),
          cut,
          fid
        );

        for (const e of ev) radius.set(e.label, e);
      }
    );
  }

  for (const [sym, ss] of bySym) {
    const d = await openEtfDoor(sym, c.door, `${env.prefix}diagnostics ${sym}`);

    for (const s of ss) {
      const b = build(s.g);
      const { days, x } = heldDays(d, s.g);
      const r = evaluate(d.door, b.quad, b.options);
      const eps = episodesOf(x);
      const winners = eps.filter((e) => e.net > 0).sort((p, q) => q.net - p.net);
      const top = winners[0] ?? null;
      let causal: Record<string, unknown> | null = null;
      let overlap: Record<string, unknown> | null = null;

      sims += 2;
      if (top) {
        const lots = x.lots.filter(
          (l) => l.entryS >= top.first && (l.open ? d.door.sessions - 1 : l.fills.at(-1)!.s) <= top.last
        );
        const firstDecision = Math.min(...lots.map((l) => l.trade.dS));
        const blackout = {
          first: d.door.dates[firstDecision]!,
          last: d.door.dates[Math.min(top.last, d.door.sessions - 1)]!
        };
        const y = evaluate(d.door, b.quad, { ...b.options, blackouts: [blackout] });

        sims++;
        causal = {
          window: blackout,
          episodeNet: r2(top.net),
          episodeShare: r.net > 0 ? Math.round((top.net / r.net) * 1e4) / 1e4 : null,
          episodeLots: lots.length,
          netWithoutNewFundingInIt: y.net,
          ddWithout: y.dd,
          arithmetic: r2(r.net - top.net)
        };

        // neighbour episode reproduction (the process audit's proposal 2; report-only): the selection draws rerun in
        // detail; a neighbour "recaptures" the episode when its leading winning episode overlaps the centre's window
        const rows0 = rowsOf(b, { name: 'select', n: fid.select, labels: ['select', cut] }).filter((q) => !q.dup);
        let over = 0;
        let clipped = 0;
        const inWindow: number[] = [];

        for (const q of rows0) {
          const z = run(d.door, q.built.quad, q.built.options, true).result;
          const zs = episodesOf(z)
            .filter((e) => e.net > 0)
            .sort((p, q2) => q2.net - p.net);
          const zt = zs[0];

          sims++;
          if (q.clipped > 0) clipped++;
          if (zt && zt.first <= top.last && zt.last >= top.first) over++;
          if (z.net > 0)
            inWindow.push(
              z.lots.filter((l) => l.entryS >= top.first && l.entryS <= top.last).reduce((a, l) => a + l.net, 0) / z.net
            );
        }
        inWindow.sort((p, q) => p - q);
        overlap = {
          draws: rows0.length,
          overlapShare: rows0.length ? Math.round((over / rows0.length) * 1e4) / 1e4 : null,
          label: rows0.length && over / rows0.length >= 0.8 ? 'single-episode stability (overlap ≥ 0.8)' : 'mixed',
          medianInWindowShare: inWindow.length
            ? Math.round(inWindow[Math.floor(inWindow.length / 2)]! * 1e4) / 1e4
            : null,
          clippedDraws: clipped
        };
      }

      const marks = x.daily;
      let peak = -Infinity;
      let under = 0;
      let run0 = 0;
      let longest = 0;

      for (let i = 0; i < d.door.sessions; i++) {
        if (marks[i]! < peak - 1e-9) {
          under++;
          run0++;
          longest = Math.max(longest, run0);
        } else run0 = 0;
        peak = Math.max(peak, marks[i]!);
      }

      const sub = (a: string, z: string) =>
        r2(
          Object.entries(r.years)
            .filter(([y]) => y >= a && y <= z)
            .reduce((p, [, v]) => p + v, 0)
        );
      const overlapOf = (ref: Set<string>) =>
        days.size ? Math.round(([...days].filter((x2) => ref.has(x2)).length / days.size) * 1e4) / 1e4 : null;

      rows.push({
        label: s.label,
        sym,
        kind: s.kind,
        why: s.why,
        id: s.id,
        g: s.g,
        centre: recSummary(r),
        subperiods: {
          '2016–2019': sub('2016', '2019'),
          '2020–2021': sub('2020', '2021'),
          '2022–2023': sub('2022', '2023'),
          '2024': sub('2024', '2024')
        },
        exposure: Math.round((r.sessionsHeld / d.door.sessions) * 1e4) / 1e4,
        underwaterShare: Math.round((under / d.door.sessions) * 1e4) / 1e4,
        longestUnderwater: longest,
        lots: x.lots.map((l) => ({
          entry: d.door.dates[l.entryS],
          exit: l.open ? null : d.door.dates[l.fills.at(-1)!.s],
          net: r2(l.net),
          interest: r2(l.interest),
          partials: l.fills.filter((f) => f.partial).length,
          kind: l.trade.kind
        })),
        episodes: eps.map((e) => ({
          first: d.door.dates[e.first],
          last: e.last === Infinity ? null : d.door.dates[Math.min(e.last, d.door.sessions - 1)],
          net: r2(e.net),
          lots: e.lots
        })),
        topEpisodeCausal: causal,
        neighbourEpisodes: overlap,
        small: radius.get(s.label)?.small ?? null,
        smallTail: radius.get(s.label)?.smallTail ?? null,
        wide: radius.get(s.label)?.wide ?? null,
        wideTail: radius.get(s.label)?.wideTail ?? null,
        busyOverlap: {
          heldDays: days.size,
          ...Object.fromEntries(Object.entries(vgtRefs).map(([k, v]) => [k, overlapOf(v)])),
          ...Object.fromEntries(Object.entries(busy).map(([k, v]) => [`${k} (any lot)`, overlapOf(v.days)])),
          ...Object.fromEntries(Object.entries(busy).map(([k, v]) => [`${k} (Growth lots)`, overlapOf(v.growthDays)]))
        }
      });
    }
  }

  // the buy-and-hold references of every eligible ETF (development; report-only)
  const bh: Record<string, unknown> = {};

  for (const sym of symbolsOf(env)) {
    const d = await openEtfDoor(sym, c.door, `${env.prefix}diagnostics buy-and-hold ${sym}`, true);

    bh[sym] = buyAndHold(d);
  }

  addToLedger({
    job: `${env.prefix}diagnostics`,
    door: `${c.door} (per ETF)`,
    fresh: sims,
    hits: 0,
    kind: 'in-process'
  });

  const record = {
    stage: 'diagnostics (report-only)',
    cutoff: cut,
    subjects: rows,
    buyAndHold: {
      note: '$100,000 bought at the first session’s opening trade after 5 bps and held, marked at every minute close; financed = 11% simple interest by calendar day on $100,000; unlevered = no interest; exit cost charged at the end; price only. Report-only, never a gate.',
      rows: bh
    },
    portfolioLedgers: Object.fromEntries(Object.entries(busy).map(([k, v]) => [k, { file: v.file, sha256: v.sha256 }])),
    finalSelection: { file: rel(finalSelectionFile(env)), sha256: sha256File(finalSelectionFile(env)) },
    shortlist: fsel.shortlist,
    finished: new Date().toISOString()
  };

  seal(env, file, record, 'diagnostics');
  log(`diagnostics: ${rows.length} subjects`);
  return record;
};

// ----- the frozen selection (sealed and committed before FULL opens) -----

export const freezeSelection = (env: Env) => {
  if (env.schedule !== 'study') throw new Error('the frozen selection is a study record');
  studyGuards(env);
  if (fs.existsSync(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json exists');
  if (!isSealed(diagnosticsFile(env))) throw new Error('the diagnostics are not sealed');

  const { fsel, subjects } = subjectsOf(env);
  const vectors = transferVectors();
  const native = vectors.map((v) => ({
    key: v.key,
    label: v.label,
    sym: v.native,
    id: v.identity,
    g: v.g,
    development: v.development,
    full: v.full
  }));
  const value = {
    kind: 'growth-etf-screening frozen selection (C24; sealed and committed before FULL opens)',
    frozenAt: new Date().toISOString(),
    futility: fsel.futility,
    primary: fsel.primary,
    primaryNew: fsel.primaryNew,
    shortlist: fsel.shortlist,
    substitutes: fsel.substitutes,
    nearMisses: fsel.nearMisses,
    ordered: fsel.ordered,
    universeRoles: fsel.universe,
    newRoles: fsel.new,
    universeProcedure: fsel.universeProcedure,
    members: subjects,
    nativeReproduction: native,
    export7B: fsel.shortlist.map((sym) => ({
      sym,
      members: subjects
        .filter((s) => s.sym === sym)
        .map((s) => ({ label: s.label, kind: s.kind, why: s.why, id: s.id, g: s.g, development: s.development }))
    })),
    validationPlan: {
      window: [chronology.validationStart, chronology.validationEnd],
      boundary: chronology.developmentEnd,
      runs: 'every member and every native transfer vector: one continuous FULL run 2016-01-04 → 2026-10-30 per ETF (forward split adjustment), boundary 2024-12-31',
      tests: { V1: 'validation P&L > 0', V2: 'reset validation DD ≤ $35,000', V3: 'whole-run DD ≤ $35,000' },
      reportOnly: [
        '10 and 20 bps per side and 14% interest on FULL',
        'validation-window neighbourhood: the C24 confirmation rep-1 draws (128) of every shortlisted ETF’s actual-profit holder and the universe primary — share positive, median and p10 validation P&L, p90 reset and whole-run DD, breaches',
        'native full-history targets of the transfer vectors on VGT and GDX',
        'the buy-and-hold references on FULL',
        'a 2025–2026 data-integrity scan of the validated ETFs (split-sized moves after adjustment; moves ≥ 15%)'
      ],
      failureMeaning:
        'a failed validation is a result: no new winner, no swap, no rescue search, no retuning; the shortlist and the 7B export are not changed by validation'
    },
    sources: {
      finalSelection: { file: rel(finalSelectionFile(env)), sha256: sha256File(finalSelectionFile(env)) },
      diagnostics: { file: rel(diagnosticsFile(env)), sha256: sha256File(diagnosticsFile(env)) }
    }
  };

  sealJson(frozenSelectionFile, value, 'frozen selection');
  log(
    `frozen selection sealed: shortlist ${value.shortlist.join(', ') || 'none'}; ${subjects.length} members; commit it before validation`
  );
  return value;
};

// ----- the one-time validation (FULL, behind the committed frozen selection) -----

export const runValidation = async (env: Env) => {
  const file = validationFile(env);

  if (env.schedule !== 'study') throw new Error('validation is a study stage');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the validation is sealed: FULL opens once');

  const frozen = readJson<{
    members: Subject[];
    nativeReproduction: {
      key: string;
      label: string;
      sym: string;
      id: string;
      g: GConfig;
      full: { net: number; dd: number; lots: number | null; validation: number } | null;
    }[];
    shortlist: string[];
    primary: string | null;
    futility: boolean;
  }>(frozenSelectionFile);

  if (frozen.futility) throw new Error('the frozen futility rule stopped the study before validation');

  const boundary = chronology.developmentEnd;
  const stressSet = { 'cost 10 bps': { costBps: 10 }, 'cost 20 bps': { costBps: 20 }, 'interest 14%': { rate: 0.14 } };
  const syms = [
    ...new Set([...frozen.members.map((m) => m.sym), ...frozen.nativeReproduction.map((v) => v.sym)])
  ].sort();
  const rows: Record<string, unknown>[] = [];
  const native: Record<string, unknown>[] = [];
  const bh: Record<string, unknown> = {};
  const integrity: Record<string, unknown> = {};
  let sims = 0;

  for (const sym of syms) {
    const d = await openEtfDoor(sym, 'FULL', 'validation (once)');
    const bi = d.door.dates.indexOf(boundary);
    const runOne = (g: GConfig) => {
      const x = sliceRun(d, g, boundary, chronology.validationEnd);
      const r = x.rec;
      const after = x.sliceLots;

      sims++;
      return {
        validationPnl: r.periods[0]!.after,
        resetDd: r.periods[0]!.dd,
        wholeNet: r.net,
        realized: r.realized,
        unrealized: r.unrealized,
        wholeDd: r.dd,
        wholeDdPeak: new Date(r.ddPeakT * 1000).toISOString().slice(0, 10),
        wholeDdTrough: new Date(r.ddTroughT * 1000).toISOString().slice(0, 10),
        lots: r.lots,
        wins: r.wins,
        losses: r.losses,
        lotsAfterBoundary: after.filter((l) => !l.carriedIn).length,
        carriedIn: after.filter((l) => l.carriedIn).length,
        openAtEnd: x.openAtSliceEnd,
        y2025: r.years['2025'] ?? 0,
        y2026: r.years['2026'] ?? 0,
        afterLots: after
      };
    };

    for (const m of frozen.members.filter((x) => x.sym === sym)) {
      const v = runOne(m.g);
      const b = build(m.g);
      const st = Object.fromEntries(
        Object.entries(stressSet).map(([k, f]) => {
          const r = evaluate(d.door, b.quad, { ...b.options, friction: f, boundaries: [boundary] });

          sims++;
          return [k, { wholeNet: r.net, validationPnl: r.periods[0]!.after, resetDd: r.periods[0]!.dd, wholeDd: r.dd }];
        })
      );

      rows.push({
        label: m.label,
        sym,
        kind: m.kind,
        why: m.why,
        id: m.id,
        developmentNet: m.development.net,
        developmentDd: m.development.dd,
        ...v,
        V1: v.validationPnl > 0,
        V2: v.resetDd <= economics.ceiling,
        V3: v.wholeDd <= economics.ceiling,
        stresses: st
      });
    }

    for (const t of frozen.nativeReproduction.filter((x) => x.sym === sym)) {
      const v = runOne(t.g);

      native.push({
        key: t.key,
        label: t.label,
        sym,
        id: t.id,
        ...v,
        target: t.full,
        reproduced: t.full
          ? v.wholeNet === t.full.net &&
            v.wholeDd === t.full.dd &&
            (t.full.lots === null || v.lots === t.full.lots) &&
            v.validationPnl === t.full.validation
          : null
      });
    }

    bh[sym] = buyAndHold(d, 0, boundary);

    // a 2025–2026 integrity scan (post-freeze): split-sized moves after adjustment, overnight moves ≥ 15%
    const big: { date: string; move: number }[] = [];

    for (let s = bi + 1; s < d.sessions.length; s++) {
      const m = d.sessions[s]!.open / d.sessions[s - 1]!.close - 1;

      if (Math.abs(m) >= 0.15) big.push({ date: d.sessions[s]!.date, move: Math.round(m * 1e4) / 1e4 });
    }
    integrity[sym] = {
      splitsApplied: d.splitsApplied,
      overnightMovesBeyond15: big,
      sessions: d.sessions.length - bi - 1
    };
  }

  // validation-window neighbourhoods (report-only; workers on FULL)
  const nbSubjects = frozen.members.filter(
    (m) =>
      m.kind === 'independent' &&
      (m.why.some((w) => /^shortlist .* actual-profit$/.test(w)) || m.label === frozen.primary)
  );
  const neighbourhoods: Record<string, unknown> = {};

  for (const m of nbSubjects) {
    const job = `validation-nbhd-${m.sym}-${m.id}`;

    await withLab(
      {
        job,
        door: doorName(m.sym, 'FULL'),
        purpose: `validation neighbourhood ${m.label}`,
        workers: Math.min(env.workers, 8)
      },
      async (lab) => {
        const b = build(m.g);
        const rowsN = rowsOf(b, { name: 'confirm', n: fidelities.study.confirm, labels: ['confirm', 1, 'C24'] }).filter(
          (q) => !q.dup
        );
        const recs = await lab.evalMany(
          rowsN.map((q) => ({ quad: q.built.quad, options: { ...q.built.options, boundaries: [boundary] } })),
          'validation-nbhd'
        );
        const pnl = recs.map((r) => r.periods[0]!.after).sort((p, q) => p - q);
        const rdd = recs.map((r) => r.periods[0]!.dd).sort((p, q) => p - q);
        const wdd = recs.map((r) => r.dd).sort((p, q) => p - q);
        const qn = (xs: number[], q: number) => r2(quantile(xs, q));

        neighbourhoods[m.label] = {
          draws: recs.length,
          positiveShare: Math.round((pnl.filter((x) => x > 0).length / Math.max(1, pnl.length)) * 1e4) / 1e4,
          zeroShare: Math.round((pnl.filter((x) => x === 0).length / Math.max(1, pnl.length)) * 1e4) / 1e4,
          medianPnl: qn(pnl, 0.5),
          p10Pnl: qn(pnl, 0.1),
          p90ResetDd: qn(rdd, 0.9),
          p90WholeDd: qn(wdd, 0.9),
          wholeBreaches: wdd.filter((x) => x > economics.ceiling).length,
          resetBreaches: rdd.filter((x) => x > economics.ceiling).length,
          clippedDraws: rowsN.filter((q) => q.clipped > 0).length
        };
      }
    );
  }

  addToLedger({ job: 'validation', door: 'FULL (per ETF)', fresh: sims, hits: 0, kind: 'in-process' });

  const record = {
    stage: 'validation (FULL, once)',
    window: [chronology.validationStart, chronology.validationEnd],
    boundary,
    guard: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    rows,
    passing: rows.filter((r) => r.V1 && r.V2 && r.V3).map((r) => r.label),
    native,
    buyAndHold: bh,
    neighbourhoods,
    integrity,
    note: 'Validation on previously examined history, not an untouched holdout. A failed validation is a result: nothing is swapped, retuned or searched again.',
    finished: new Date().toISOString()
  };

  seal(env, file, record, 'validation');
  log(
    `validation: ${rows.length} rows; passing V1–V3: ${record.passing.length}; native reproduced ${native.filter((n) => n.reproduced).length}/${native.filter((n) => n.reproduced !== null).length}`
  );
  return record;
};

export { plausible, toggles, usd, resultsDir };
