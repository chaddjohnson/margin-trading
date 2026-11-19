// D6 (PROTOCOL.md §6; amendment A1): every row the audited fold stages evaluated on a slice under its own convention
// (role holders and seed-level replicate primaries of 5B L0, the session study, B1 and B2), replayed once on the
// evaluation door with its study's code: gate G3 (the sealed row reproduced field for field) and the prevalence of the
// failure mechanisms across the procedures' winners — the lot carried across the cutoff (its mark at the boundary and
// its slice change), the worst slice lot and MAE, maximum-hold losses, exits by reason, and family booked P&L.
// Report-only and descriptive (already-published slice outcomes; nothing is selectable).
// Run from the repository root with WFD_SES_WT=<session worktree>.
import path from 'node:path';
import { openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { recordOf as p3RecordOf, run as p3Run } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { optionsOfInc as options5B } from '../../src/vg-lifecycle-matched-optimization/config.ts';
import { optionsOfInc as optionsSh } from '../../src/vg-l0-shadow-eligibility/config.ts';
import { recordOf as shRecordOf, run as shRun } from '../../src/vg-l0-shadow-eligibility/evaluate.ts';
import { audited, ceiling, folds, logDoor, r2, readRecord, repoRoot, resultsDir, sealJson } from './common.ts';
import { compareRecords, type LotLike, type ResultLike, sliceAnalysis } from './core.ts';

const wt = process.env.WFD_SES_WT;

if (!wt) throw new Error('WFD_SES_WT (the session study worktree) is required');

const imp = async <T>(rel: string) => (await import(path.join(wt, rel))) as T;
const sesData = await imp<{ openPrefixDoor: (d: string, p: string, q: boolean) => Promise<any> }>('src/vg-d1-growth-joint/data.ts');
const sesUnit = await imp<{ runUnit: (...a: any[]) => any; recordOfRun: (...a: any[]) => any }>('src/vg-l0-session-hold/unit.ts');
const sesConfig = await imp<{ optionsOfInc: (inc: string) => any }>('src/vg-l0-session-hold/config.ts');

const doorCache = new Map<string, any>();
const doorOf = async (kind: 'main' | 'ses', name: string) => {
  const k = `${kind}|${name}`;

  if (!doorCache.has(k)) {
    const d = kind === 'main' ? await openPrefixDoor(name as never, 'wfd D6', true) : await sesData.openPrefixDoor(name, 'wfd D6', true);

    logDoor(name, `D6 evaluated-row replay (${kind === 'main' ? 'this checkout' : 'session worktree 18674b39'}; development door)`, {
      GDX: d.sym.GDX.dataSha256,
      VGT: d.sym.VGT.dataSha256
    });
    doorCache.set(k, d);
  }
  return doorCache.get(k);
};

const own: Record<string, (r: any) => boolean> = {
  '5B-L0': (r) => r.mode === 'L0' && r.own === true,
  SES: (r) => r.unit === 'ses' && r.own === true,
  B1: (r) => r.track === 'B1',
  B2: (r) => r.track === 'B2'
};

let simulations = 0;
const rows: Record<string, unknown>[] = [];

for (const key of ['5B-L0', 'SES', 'B1', 'B2'] as const) {
  for (const f of folds) {
    if (process.env.WFD_FOLD && process.env.WFD_FOLD !== f.fold) continue; // a code check on one fold (dry runs only)

    const ev = readRecord<{ primary: Record<string, string>; rows: any[] }>(path.join(repoRoot, audited[key].path, 'results/folds', f.fold, 'evaluation.json'));
    const primary = key === '5B-L0' ? ev.primary.L0 : key === 'SES' ? ev.primary.ses : ev.primary[key];

    for (const row of ev.rows.filter(own[key]!)) {
      const cfg = row.cfg;
      const base = key === '5B-L0' ? options5B(cfg.inc) : key === 'SES' ? sesConfig.optionsOfInc(cfg.inc) : optionsSh(cfg.inc);
      const o = { ...base, boundaries: [f.boundary] };
      const door = await doorOf(key === 'SES' ? 'ses' : 'main', f.evalDoor);
      const x =
        key === '5B-L0' ? p3Run(door, cfg.quad, o, true, true) : key === 'SES' ? sesUnit.runUnit(door, cfg.quad, o, 'ses', true) : shRun(door, cfg.quad, o, cfg.sh, true, true);
      const rec =
        key === '5B-L0'
          ? p3RecordOf(door, cfg.quad, x, o)
          : key === 'SES'
            ? sesUnit.recordOfRun(door, cfg.quad, x, o, 'ses')
            : shRecordOf(door, cfg.quad, x, o, cfg.sh);

      simulations++;

      const g3 = compareRecords(rec as unknown as Record<string, unknown>, row.record);
      const r = x.result as ResultLike;
      const b = door.dates.indexOf(f.boundary);
      const sl = sliceAnalysis(door, r, f.boundary, 2);
      const slots = r.lots.filter((l: LotLike) => l.open || l.fills.at(-1)!.s > b);
      const fresh = slots.filter((l) => l.entryS > b);
      const maxHoldLosses = fresh.filter((l) => l.net < 0 && l.fills.some((x) => x.reason === 'maximum hold'));
      const reasons: Record<string, { lots: number; net: number }> = {};

      for (const l of fresh) {
        const k = `${l.book} ${l.trade.kind} → ${[...new Set(l.fills.map((x) => x.reason))].join('+') || 'open'}`;

        reasons[k] ??= { lots: 0, net: 0 };
        reasons[k].lots++;
        reasons[k].net = r2(reasons[k].net + l.net);
      }

      const carried = sl.carried[0] ?? null;
      const ep = sl.episodes[0] ?? null;

      rows.push({
        path: key,
        fold: f.fold,
        label: row.label,
        role: row.role,
        primary: row.label === primary,
        inc: cfg.inc,
        sh: cfg.sh ?? null,
        g3: g3.diffs.length === 0 ? 'ok' : g3.diffs,
        trainingNet: sl.boundaryEquity,
        sliceNet: row.sliceNet,
        sliceDd: row.sliceDd,
        breach: row.sliceDd > ceiling,
        carried: carried ? { book: carried.book, entry: carried.entry, markAtBoundary: carried.markAtBoundary, sliceChange: carried.sliceChange } : null,
        carriedShareOfTraining: carried && sl.boundaryEquity ? r2((100 * carried.markAtBoundary) / sl.boundaryEquity) / 100 : 0,
        worstEpisode: ep
          ? {
              peak: ep.peak,
              trough: ep.trough,
              depth: ep.depth,
              carriedGiveBack: r2(
                ep.contributions.filter((c) => carried && c.lot === carried.lot).reduce((a, c) => a + c.change, 0)
              ),
              largestSingleLoss: r2(Math.min(0, ...ep.contributions.map((c) => c.change))),
              losingLots: ep.contributions.filter((c) => c.change < 0 && c.book !== 'flat').length,
              byFamily: {
                D1: r2(ep.contributions.filter((c) => c.book.startsWith('D1')).reduce((a, c) => a + c.change, 0)),
                G: r2(ep.contributions.filter((c) => c.book.startsWith('G')).reduce((a, c) => a + c.change, 0))
              }
            }
          : null,
        freshLots: fresh.length,
        worstFreshLot: r2(Math.min(0, ...fresh.map((l) => l.net))),
        worstFreshMae: r2(Math.min(0, ...fresh.map((l) => l.worst))),
        maxHoldLosses: { lots: maxHoldLosses.length, net: r2(maxHoldLosses.reduce((a, l) => a + l.net, 0)) },
        exitsByReason: reasons,
        occupancy: sl.occupancy,
        refusals: sl.refusals.total
      });
    }
    console.log(`${key} ${f.fold}: ${rows.filter((x) => x.path === key && x.fold === f.fold).length} rows`);
  }
}

if (process.env.WFD_FOLD && !process.argv.includes('--dry')) throw new Error('WFD_FOLD is for dry runs only');

sealJson(
  path.join(resultsDir, 'replays', 'evaluated-rows.json'),
  {
    stage: 'D6 every evaluated fold row replayed on its slice (G3 + mechanism prevalence; report-only)',
    simulations,
    g3Failed: rows.filter((x) => x.g3 !== 'ok').length,
    rows,
    finished: new Date().toISOString()
  },
  'D6 evaluated rows'
);
console.log(`simulations ${simulations}; G3 failed ${rows.filter((x) => x.g3 !== 'ok').length}`);
