// P5-NS report-only diagnostics (PROTOCOL.md §11.2, §16) — NON-OFFICIAL (GPU_POLICY_PURPOSE cpu-reference | diagnostic),
// after the sealed records they read; never a selection, ranking or stopping input; labelled in every report.
//   chain                 the CPU reference exact minute chain of every sequential path (Assignment 3's foldRun +
//                         sequentialDrawdown) beside the sealed GPU statistic: the one-directional qualifier of §11.2
//   lots --door D24|FULL  the funded-lot ledgers of the C24 finalists and the references (CPU reference, detailed records:
//                         per-lot net, MAE, peak, giveback, holding days, exit reasons; risk decomposition inputs)
//   families              the report-only half-radius (0.5×) and wide (1.5×) neighbourhood families (2 × 128 each) of
//                         every C24 finalist and reference on D24 (non-official GPU, purpose diagnostic): plateau breadth
//   tail                  the D1 maximum-hold-window tail stress (standard §5.9; AD11): Assignment 3's tools/vg-l0-full-joint/
//                         tail.ts logic, copied (that module runs on import and logs into Assignment 3's door log)
import fs from 'node:fs';
import path from 'node:path';
import { foldRun } from '../../src/vg-l0-full-joint/folds.ts';
import { sequentialDrawdown } from '../../src/vg-d1-growth-joint/post.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, canonicalCfg, cfgId, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { cutoffs, foldKeys, resultsDir, researchDir } from '../../src/vg-l0-n-successor/context.ts';
import { openP5Door, selectionFile, sequentialFile, sliceFile } from '../../src/vg-l0-n-successor/doors.ts';
import { charge } from '../../src/vg-l0-n-successor/sequential.ts';
import { openToolLab, purposeOf, writeJson } from './common.ts';
import { drawsOf, famOf } from '../../src/vg-l0-full-joint/qualify.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { loadSessions } from '../../src/four-family/data.ts';
import { quantile } from '../../src/vg-l0-full-joint/fitness.ts';
import { controlValuesOf } from '../../src/vg-l0-full-joint/space.ts';
import { sha256File } from '../../src/vg-l0-n-successor/records.ts';
import { doorLog, repoRoot } from '../../src/vg-l0-n-successor/context.ts';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string, d = '') => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const rd = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
const diagDir = path.join(researchDir, 'reports', 'diagnostics');

const chainCpu = async () => {
  purposeOf(['cpu-reference', 'diagnostic']);

  const seq = rd<{ procedures: { population: string; labels: (string | null)[]; drawdown: number; net: number; supported: boolean; verdict: string }[]; descriptive: { name: string; labels: (string | null)[]; drawdown: number; net: number }[] }>(sequentialFile);
  const slices = foldKeys.map((c) => rd<{ rows: { label: string; id: string }[] }>(sliceFile(c)));
  const sels = foldKeys.map((c) => rd<{ subjects: { label: string; cfg: Cfg }[]; controls: { label: string; cfg: Cfg }[] }>(selectionFile(c)));
  const cfgOf = (i: number, label: string) => canonicalCfg((sels[i]!.subjects.find((s) => s.label === label) ?? sels[i]!.controls.find((s) => s.label === label))!.cfg);
  const marks: Record<string, ReturnType<typeof foldRun>> = {};

  for (let i = 0; i < foldKeys.length; i++) {
    const c = foldKeys[i]!;
    const door = await openP5Door(cutoffs[c].sliceDoor, 'diagnostic', `report-only CPU reference exact minute chain ${c} (PROTOCOL.md §11.2)`);
    const labels = new Set([...seq.procedures, ...seq.descriptive].map((p) => p.labels[i]).filter((l): l is string => Boolean(l)));

    for (const l of labels) marks[`${c}|${l}`] = foldRun(door, cfgOf(i, l), cutoffs[c].end);
    void slices;
  }

  const exact = (labels: (string | null)[]) => {
    let prev: { id: string; openAtEnd: number } | null = null;
    const parts = labels.map((l, i) => {
      if (!l) {
        const ch = prev ? charge * prev.openAtEnd : 0;

        prev = null;
        return { t: [] as number[], v: [] as number[], charge: ch };
      }

      const m = marks[`${foldKeys[i]}|${l}`]!;
      const ch = prev && prev.id !== m.rec.id ? charge * (prev.openAtEnd + m.openAtBoundary.length) : 0;

      prev = { id: m.rec.id, openAtEnd: m.openAtEnd.length };
      return { t: m.t, v: m.v, charge: ch };
    });

    return sequentialDrawdown(parts, 0);
  };
  const rows = [...seq.procedures.map((p) => ({ name: `${p.population}/original`, ...p })), ...seq.descriptive].map((p) => {
    const x = exact(p.labels);
    const supported = 'supported' in p ? (p as { supported: boolean }).supported : null;

    return {
      path: p.name,
      gpuStatistic: p.drawdown,
      cpuExactMinute: Math.round(x.maximum * 100) / 100,
      gap: Math.round((x.maximum - p.drawdown) * 100) / 100,
      gpuNet: p.net,
      cpuNet: Math.round(x.total * 100) / 100,
      qualifier: supported && x.maximum > 35_000 ? `supported by the GPU statistic; the exact minute chain (CPU reference) breaches by $${(x.maximum - 35_000).toFixed(2)} — the support is not robust to intraday cross-boundary marks` : null
    };
  });

  writeJson(path.join(diagDir, 'chain-cpu.json'), { kind: 'report-only CPU reference exact minute chain (non-official; never the verdict; one-directional qualifier PROTOCOL.md §11.2)', rows, finished: new Date().toISOString() });
  console.log(JSON.stringify(rows.map((r) => `${r.path}: GPU ${r.gpuStatistic} CPU ${r.cpuExactMinute} gap ${r.gap}${r.qualifier ? ' QUALIFIED' : ''}`)));
};

const lots = async () => {
  purposeOf(['cpu-reference', 'diagnostic']);

  const doorName = opt('door', 'D24') as 'D24' | 'FULL';
  const fz = rd<{ finalists: { label: string }[] }>(path.join(researchDir, 'FROZEN_SELECTION.json'));
  const sel = rd<{ subjects: { label: string; cfg: Cfg }[]; controls: { label: string; cfg: Cfg }[] }>(selectionFile('C24'));
  const subjects = [...fz.finalists.map((f) => sel.subjects.find((s) => s.label === f.label)!), ...sel.controls];
  const door = await openP5Door(doorName, 'diagnostic', `report-only funded-lot ledgers of the C24 finalists and references on ${doorName}`);
  const rows = subjects.map((s) => {
    const cfg = canonicalCfg(s.cfg);
    const x = runWithControls2(door, quadOf(cfg), cfg.controls, vOptions, true, false);
    const lotRows = x.result.lots.map((l) => ({
      book: l.book,
      entry: door.dates[l.entryS],
      exit: l.open ? null : door.dates[l.fills.at(-1)!.s],
      reason: l.open ? 'open' : l.fills.at(-1)!.reason,
      principal: Math.round(l.principal0 * 100) / 100,
      net: Math.round(l.net * 100) / 100,
      worst: Math.round(Math.min(l.worst, l.net) * 100) / 100,
      best: Math.round(Math.max(l.best, l.net) * 100) / 100,
      giveback: Math.round((Math.max(l.best, l.net) - l.net) * 100) / 100,
      interest: Math.round(l.interest * 100) / 100,
      costs: Math.round(l.costs * 100) / 100,
      days: Math.round(((l.open ? door.sym.VGT.ds.sTime[door.sessions - 1]! : door.sym.VGT.ds.sTime[l.fills.at(-1)!.s]!) - door.sym.VGT.ds.sTime[l.entryS]!) / 864) / 100
    }));

    return { label: s.label, id: cfgId(cfg), lots: lotRows };
  });

  writeJson(path.join(diagDir, `lots-${doorName}.json`), { kind: `report-only funded-lot ledgers (CPU reference, non-official) on ${doorName}`, rows, finished: new Date().toISOString() });
  console.log(`${rows.length} ledgers written`);
};


// ----- the D1 maximum-hold-window tail stress (Assignment 3's tail.ts, copied; daily-bar approximation) -----

interface Daily {
  dates: string[];
  open: number[];
  low: number[];
  close: number[];
}
const r2 = (x: number) => Math.round(x * 100) / 100;
const fromDataset = (ds: { dates: string[]; sOpen: Float64Array; sLow: Float64Array; sClose: Float64Array; sessionCount: number }): Daily => ({
  dates: ds.dates.slice(0, ds.sessionCount),
  open: Array.from(ds.sOpen.slice(0, ds.sessionCount)),
  low: Array.from(ds.sLow.slice(0, ds.sessionCount)),
  close: Array.from(ds.sClose.slice(0, ds.sessionCount))
});
const loadProxy = async (symbol: string): Promise<Daily & { sha256: string; jumps: string[] }> => {
  const file = path.join(repoRoot, 'data', symbol, 'data.csv');
  const sessions = (await loadSessions(file, symbol)).filter((s) => s.date >= '2016-01-04' && s.date <= '2024-12-31');
  const d: Daily = { dates: sessions.map((s) => s.date), open: sessions.map((s) => s.open), low: sessions.map((s) => s.low), close: sessions.map((s) => s.close) };
  const jumps: string[] = [];

  for (let i = 1; i < d.close.length; i++) if (Math.abs(d.open[i]! / d.close[i - 1]! - 1) > 0.25) jumps.push(d.dates[i]!);
  fs.appendFileSync(doorLog, `${JSON.stringify({ t: new Date().toISOString(), door: `proxy ${symbol}`, purpose: 'report-only tail stress (2016-01-04 → 2024-12-31 kept; later rows dropped on read)', pid: process.pid })}\n`);
  return { ...d, sha256: sha256File(file), jumps };
};
const day = 86_400_000;
const holdOf = (cfg: Cfg, s: 'GDX' | 'VGT') => {
  const h = cfg.controls?.books[`D1:${s}`]?.hold;

  return h?.mode === 'disabled' ? { days: 60, basis: 'disabled: 60-day declared bound' } : h?.mode === 'adaptive' ? { days: h.extendedHoldDays, basis: 'adaptive: the extended bound' } : { days: cfg.d1[s].maximumHoldDays, basis: 'legacy calendar hold' };
};
const stress = (d: Daily, holdDays: number, stopTenths: number | null) => {
  const cost = 0.0005;
  const losses: { loss: number; date: string }[] = [];
  let worstGap = { beyond: 0, date: '' as string };

  for (let i = 0; i < d.close.length; i++) {
    const entry = d.close[i]! * (1 + cost);
    const shares = 100_000 / entry;
    const endT = Date.parse(`${d.dates[i]}T00:00:00Z`) + holdDays * day;
    let j = i;

    while (j + 1 < d.close.length && Date.parse(`${d.dates[j + 1]}T00:00:00Z`) <= endT) j++;
    if (j === i) continue;

    let exit = d.close[j]!;
    let exitIdx = j;

    if (stopTenths !== null) {
      const level = d.close[i]! * (1 - stopTenths / 1000);

      for (let k = i + 1; k <= j; k++) {
        if (d.open[k]! <= level) {
          exit = d.open[k]!;
          exitIdx = k;
          if ((level - exit) / d.close[i]! > worstGap.beyond) worstGap = { beyond: (level - exit) / d.close[i]!, date: d.dates[k]! };
          break;
        }
        if (d.low[k]! <= level) {
          exit = level;
          exitIdx = k;
          break;
        }
      }
    }

    const days = (Date.parse(`${d.dates[exitIdx]}T00:00:00Z`) - Date.parse(`${d.dates[i]}T00:00:00Z`)) / day;

    losses.push({ loss: shares * exit * (1 - cost) - 100_000 - (100_000 * 0.11 * days) / 365, date: d.dates[i]! });
  }

  const sorted = [...losses].sort((a, b) => a.loss - b.loss);
  const worst = sorted[0]!;

  return {
    windows: losses.length,
    worstLoss: r2(worst.loss),
    worstEntry: worst.date,
    p95Loss: r2(quantile(sorted.map((x) => x.loss), 0.05)),
    shareBelowMinus10k: r2(losses.filter((x) => x.loss < -10_000).length / losses.length),
    worstGapThroughStopPct: stopTenths === null ? null : { beyondStopPct: r2(100 * worstGap.beyond), date: worstGap.date || null }
  };
};
const synthetic = (stopTenths: number | null) =>
  Object.fromEntries(
    [10, 20, 30].map((g) => {
      const fill = stopTenths === null ? null : g > stopTenths / 10 ? 1 - g / 100 : 1 - stopTenths / 1000;

      return [`gap −${g}%`, fill === null ? 'no protective stop: no exit (held to the hold rule)' : r2((100_000 / 1.0005) * fill * 0.9995 - 100_000)];
    })
  );
const tailStress = async () => {
  purposeOf(['cpu-reference', 'diagnostic']);

  const fz = rd<{ finalists: { label: string }[] }>(path.join(researchDir, 'FROZEN_SELECTION.json'));
  const sel = rd<{ subjects: { label: string; cfg: Cfg; cell: string }[]; controls: { label: string; cfg: Cfg; cell: string }[] }>(selectionFile('C24'));
  const subjects = [...fz.finalists.map((f) => sel.subjects.find((s) => s.label === f.label)!), ...sel.controls];
  const door = await openP5Door('D24', 'diagnostic', 'report-only tail stress (in-sample 2016-2024)');
  const own: Record<'GDX' | 'VGT', Daily> = { GDX: fromDataset(door.sym.GDX.ds as never), VGT: fromDataset(door.sym.VGT.ds as never) };
  const proxies = { VGT: await loadProxy('XLK'), GDX: await loadProxy('GDXJ') };
  const rows = subjects.map((f) => {
    const cfg = canonicalCfg(f.cfg);

    return {
      label: f.label,
      cell: cfg.cell,
      books: Object.fromEntries(
        (['GDX', 'VGT'] as const).map((s) => {
          const h = holdOf(cfg, s);
          const d = controlValuesOf(cfg, s).d ?? null;

          return [
            `D1·${s}`,
            {
              holdDays: h.days,
              holdBasis: h.basis,
              stopDistancePct: d === null ? null : d / 10,
              inSample: { unprotected: stress(own[s], h.days, null), protected: d === null ? null : stress(own[s], h.days, d) },
              proxy: { symbol: s === 'VGT' ? 'XLK' : 'GDXJ', unprotected: stress(proxies[s], h.days, null), protected: d === null ? null : stress(proxies[s], h.days, d) },
              syntheticGaps: synthetic(d)
            }
          ];
        })
      )
    };
  });

  writeJson(path.join(diagDir, 'tail-stress.json'), {
    labels: { inSample: 'in-sample stress (examined history 2016–2024; not evidence from unseen history)', proxy: 'proxy, same period, not disjoint', precision: 'daily-bar approximation (no minute precision is claimed)' },
    proxies: { XLK: { sha256: proxies.VGT.sha256, jumpsOver25pct: proxies.VGT.jumps }, GDXJ: { sha256: proxies.GDX.sha256, jumpsOver25pct: proxies.GDX.jumps } },
    rows,
    finished: new Date().toISOString()
  });
  console.log(`${rows.length} tail-stress rows written`);
};

// ----- report-only neighbourhood families of other radii (plateau breadth) -----

const families = async () => {
  purposeOf(['diagnostic']);

  const fz = rd<{ finalists: { label: string }[] }>(path.join(researchDir, 'FROZEN_SELECTION.json'));
  const sel = rd<{ subjects: { label: string; cfg: Cfg }[]; controls: { label: string; cfg: Cfg }[] }>(selectionFile('C24'));
  const subjects = [...fz.finalists.map((f) => sel.subjects.find((s) => s.label === f.label)!), ...sel.controls];
  const t = await openToolLab({ backend: 'gpu', door: 'D24', use: 'diagnostic', area: 'diagnostics', job: 'families-D24', purpose: 'diagnostic: report-only 0.5x / 1.5x neighbourhood families of the C24 finalists', ledger: path.join(diagDir, 'families-receipts.jsonl') });
  const q = (xs: number[], p: number) => {
    const s = [...xs].sort((a, b) => a - b);
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);

    return s.length ? s[lo]! + (s[Math.min(s.length - 1, lo + 1)]! - s[lo]!) * (i - lo) : NaN;
  };

  try {
    const rows = [];

    for (const s of subjects) {
      const cfg = canonicalCfg(s.cfg);
      const out: Record<string, unknown> = { label: s.label, id: cfgId(cfg) };

      for (const [name, scale] of [['small', 0.5], ['wide', 1.5]] as const) {
        const draws = [1, 2].flatMap((rep) => drawsOf(cfg, famOf(name, [name, rep, 'C24'], 'joint', scale)));
        const seen = new Set<string>();
        const unique = draws.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
        const recs = await t.lab.evalMany<SRec>(unique.map((d) => ({ cfg: d.cfg, options: vOptions })), `families ${name}`);
        const nets = recs.map((r) => (r.error ? -100_000 : r.net));
        const dds = recs.map((r) => (r.error ? Infinity : r.dd));
        const k = dds.filter((d) => d > 35_000).length;

        out[name] = { scale, draws: unique.length, medianNet: r2(q(nets, 0.5)), p10Net: r2(q(nets, 0.1)), robust: r2(0.5 * q(nets, 0.5) + 0.5 * q(nets, 0.1)), p90Dd: r2(q(dds, 0.9)), p95Dd: r2(q(dds, 0.95)), worstDd: r2(Math.max(...dds)), breaches: k, breachShare: r2(k / Math.max(1, unique.length)), positiveShare: r2(nets.filter((x) => x > 0).length / Math.max(1, nets.length)) };
      }
      rows.push(out);
    }
    writeJson(path.join(diagDir, 'families.json'), { kind: 'report-only neighbourhood families 0.5x and 1.5x of the instrument radius (Assignment 3 instrument, labels (small|wide, rep, C24)); non-official GPU (purpose diagnostic); never a gate, role or ranking input', rows, finished: new Date().toISOString() });
    console.log(`${rows.length} family rows written`);
  } finally {
    await t.close();
  }
};

if (cmd === 'chain') await chainCpu();
else if (cmd === 'lots') await lots();
else if (cmd === 'tail') await tailStress();
else if (cmd === 'families') await families();
else throw new Error('chain | lots --door D24|FULL | tail | families');
void resultsDir;
