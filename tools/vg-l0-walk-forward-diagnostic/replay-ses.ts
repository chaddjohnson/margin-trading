// Replays of the trading-session study's fold primaries (PROTOCOL.md §5, §6 D3, D4, D8; gate G3) with that study's own
// code at commit 18674b39, loaded from a temporary detached worktree (WFD_SES_WT; door files copied, not linked). Each
// fold primary runs under its own unit 'ses' (the chronological test) and, report-only, under 'cal' (the sealed cross
// row). Outputs are written to this checkout's results/ only; the worktree is never written to except its door copies.
// Run from the repository root of this checkout: WFD_SES_WT=<worktree> node … tools/vg-l0-walk-forward-diagnostic/replay-ses.ts
import { execSync } from 'node:child_process';
import path from 'node:path';
import { folds, logDoor, r2, readRecord, repoRoot, resultsDir, sealJson, sha256File } from './common.ts';
import { compareRecords, type DoorLike, type ResultLike, sliceAnalysis, trainingAnalysis } from './core.ts';

const wt = process.env.WFD_SES_WT;

if (!wt) throw new Error('WFD_SES_WT (the session study worktree) is required');

const commit = execSync('git rev-parse HEAD', { cwd: wt }).toString().trim();

if (!commit.startsWith('18674b39')) throw new Error(`the worktree is at ${commit}, not 18674b39`);

const imp = async <T>(rel: string) => (await import(path.join(wt, rel))) as T;
const data = await imp<{ openPrefixDoor: (d: string, p: string, q: boolean) => Promise<any> }>('src/vg-d1-growth-joint/data.ts');
const unit = await imp<{ runUnit: (...a: any[]) => any; recordOfRun: (...a: any[]) => any }>('src/vg-l0-session-hold/unit.ts');
const config = await imp<{ optionsOfInc: (inc: string) => any }>('src/vg-l0-session-hold/config.ts');
const lab = await imp<{ codeDigest: () => string }>('src/vg-l0-session-hold/lab.ts');
const p3lab = await imp<{ codeDigest: () => string }>('src/vg-d1-growth-joint/lab.ts');
const S = path.join(repoRoot, 'research/vg-l0-session-hold');
const sealedDigest = readRecord<{ evaluationDigest: string }>(path.join(S, 'results/protocol-freeze.json')).evaluationDigest;
const g2 = { session: { digest: lab.codeDigest(), sealed: sealedDigest }, priority3AtCommit: p3lab.codeDigest() };

const doors = new Map<string, any>();
const doorOf = async (name: string) => {
  if (!doors.has(name)) {
    const d = await data.openPrefixDoor(name, 'vg-l0-walk-forward-diagnostic session replay', true);

    logDoor(name, 'session-study replay (worktree 18674b39 door copy; development door; FULL never opened)', {
      GDX: d.sym.GDX.dataSha256,
      VGT: d.sym.VGT.dataSha256
    });
    doors.set(name, d);
  }
  return doors.get(name);
};

const enabledBooks = (inc: string) =>
  ['D1:GDX', 'D1:VGT', ...(inc === 'B' || inc === 'G' ? ['G:GDX'] : []), ...(inc === 'B' || inc === 'V' ? ['G:VGT'] : [])];

let simulations = 0;
const out: Record<string, unknown>[] = [];

for (const f of folds) {
  const ev = readRecord<{ primary: string | Record<string, string>; rows: { label: string; unit: string; cfg: any; record: Record<string, unknown>; sliceNet: number; sliceDd: number }[] }>(
    path.join(S, 'results/folds', f.fold, 'evaluation.json')
  );
  const sel = readRecord<{ evidence: { label: string; unit?: string; centre: Record<string, unknown> }[] }>(
    path.join(S, 'results/folds', f.fold, 'selection.json')
  );
  const label = typeof ev.primary === 'string' ? ev.primary : (ev.primary.ses ?? Object.values(ev.primary)[0]!);

  for (const u of ['ses', 'cal']) {
    const row = ev.rows.find((r) => r.label === label && r.unit === u)!;
    const base = config.optionsOfInc(row.cfg.inc);
    const evalDoor = await doorOf(f.evalDoor);
    const o = { ...base, boundaries: [f.boundary] };
    const x = unit.runUnit(evalDoor, row.cfg.quad, o, u, true);
    const rec = unit.recordOfRun(evalDoor, row.cfg.quad, x, o, u);

    simulations++;

    const g3 = compareRecords(rec, row.record);
    let causal: { fields: number; diffs: string[] } | null = null;

    if (u === 'ses') {
      const centre = sel.evidence.find((e) => e.label === label)!.centre;
      const trainDoor = await doorOf(f.trainDoor);
      const y = unit.runUnit(trainDoor, row.cfg.quad, base, u, false);

      simulations++;
      causal = compareRecords(unit.recordOfRun(trainDoor, row.cfg.quad, y, base, u), centre);
    }

    const removals: string[][] = u === 'ses' ? [...enabledBooks(row.cfg.inc).map((b) => [b]), ['D1:GDX', 'D1:VGT']] : [];
    const removal = removals.map((bks) => {
      const ro = { ...o, enabled: { ...(o.enabled ?? {}), ...Object.fromEntries(bks.map((b) => [b, false])) } };
      const rr = unit.recordOfRun(evalDoor, row.cfg.quad, unit.runUnit(evalDoor, row.cfg.quad, ro, u, false), ro, u);

      simulations++;
      return {
        without: bks.join(' + '),
        sliceNet: rr.periods[0].after,
        sliceDd: rr.periods[0].dd,
        boundaryEquity: rr.periods[0].equity,
        wholeNet: rr.net,
        wholeDd: rr.dd,
        causalSliceNet: r2(row.sliceNet - rr.periods[0].after),
        causalSliceDd: r2(row.sliceDd - rr.periods[0].dd)
      };
    });
    const b = evalDoor.dates.indexOf(f.boundary);
    const res = x.result as ResultLike;

    out.push({
      path: 'SES',
      fold: f.fold,
      label,
      unit: u,
      role: u === 'ses' ? 'fold primary' : 'cross row (calendar days; report-only)',
      cfg: row.cfg,
      sealed: { sliceNet: row.sliceNet, sliceDd: row.sliceDd },
      g3: { ok: g3.diffs.length === 0, ...g3 },
      causalPrefix: causal ? { ok: causal.diffs.length === 0, ...causal } : null,
      slice: sliceAnalysis(evalDoor as DoorLike, res, f.boundary),
      training: trainingAnalysis(res, b),
      removal
    });
    console.log(
      `SES ${f.fold} ${label} [${u}]: G3 ${g3.diffs.length ? `DIFF ${g3.diffs.join(',')}` : 'ok'}; causal ${causal ? (causal.diffs.length ? `DIFF ${causal.diffs.join(',')}` : 'ok') : 'n/a'}; slice ${row.sliceNet}`
    );
  }
}

sealJson(
  path.join(resultsDir, 'replays', 'session.json'),
  {
    stage: 'replays: trading-session fold primaries under ses (and cal, report-only) (D3, D4, D8, G3)',
    worktreeCommit: commit,
    doorCopies: Object.fromEntries(
      ['D19', 'D21', 'D23', 'D24'].flatMap((d) => ['GDX', 'VGT'].map((s) => [`${s}-${d}`, sha256File(path.join(wt, '.cache/vg-d1-growth-joint/doors', `${s}-${d}.csv`))]))
    ),
    g2,
    simulations,
    g3Failed: out.filter((x) => !(x.g3 as { ok: boolean }).ok).length,
    causalFailed: out.filter((x) => x.causalPrefix && !(x.causalPrefix as { ok: boolean }).ok).length,
    subjects: out,
    finished: new Date().toISOString()
  },
  'replays session'
);
console.log(`simulations ${simulations}; session digest ${g2.session.digest === g2.session.sealed ? 'equal' : 'DIFFERS'} (${g2.session.digest.slice(0, 12)}); P3 at commit ${g2.priority3AtCommit.slice(0, 12)}`);
