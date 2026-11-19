// The D1 maximum-hold-window tail stress (standard §5.9; PROTOCOL.md AD11, §13 item 3; report-only). No disjoint pre-2016
// data exist on the machine, so for each D1 book of each C24 finalist and New L0:
//   (a) IN-SAMPLE STRESS — the book's own symbol over 2016-01-04 → 2024-12-31 (the D24 door; examined history);
//   (b) PROXY (same period, not disjoint) — XLK for D1·VGT, GDXJ for D1·GDX, 2016-01-04 → 2024-12-31 only (later rows are
//       dropped as the file is read; split register: no split of either in that window; a > 25% consecutive-session jump
//       scan is reported);
//   (c) SYNTHETIC GAPS — an opening print 10%, 20%, 30% below the entry: the protective stop's realized loss.
// A DAILY-BAR APPROXIMATION, labelled as such (no minute precision is claimed): a $100,000 lot bought at each session
// close and held for the book's hold window (legacy/adaptive base: its hold; adaptive: the extended bound; disabled: 60
// calendar days, the adaptive box's bound), its loss at the window's last close net of 11% interest; with a protective
// stop at distance d, the first later session whose open ≤ L sells at that open (a gap through the stop), else whose low
// ≤ L sells at L; costs (5 bps per side) included. Worst and p95 losses with dates; the worst gap through the stop.
//   node --experimental-transform-types tools/vg-l0-risk-families/tail.ts [--dry]
import { openStudyDoor } from '../../src/vg-l0-risk-families/doors.ts';
import { frozenSelectionFile, repoRoot } from '../../src/vg-l0-risk-families/context.ts';
import { readJson } from '../../src/vg-l0-risk-families/records.ts';
import { type Cfg, controlValuesOf } from '../../src/vg-l0-risk-families/space.ts';
import { loadSessions } from '../../src/four-family/data.ts';
import { logDoor, sha256File } from '../../src/vg-l0-risk-families/records.ts';
import { quantile } from '../../src/vg-l0-risk-families/fitness.ts';
import { r2, writeDiagnostic } from './common.ts';
import path from 'node:path';

const dry = process.argv.includes('--dry');

interface Daily {
  dates: string[];
  open: number[];
  low: number[];
  close: number[];
}

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
  logDoor(`proxy ${symbol}`, 'report-only tail stress (2016-01-04 → 2024-12-31 kept; later rows dropped on read)', {});
  return { ...d, sha256: sha256File(file), jumps };
};

const day = 86_400_000;
const holdOf = (cfg: Cfg, s: 'GDX' | 'VGT') => {
  const h = cfg.controls?.books[`D1:${s}`]?.hold;

  return h?.mode === 'disabled' ? { days: 60, basis: 'disabled: 60-day declared bound' } : h?.mode === 'adaptive' ? { days: h.extendedHoldDays, basis: 'adaptive: the extended bound' } : { days: cfg.d1[s].maximumHoldDays, basis: 'legacy calendar hold' };
};

export const stress = (d: Daily, holdDays: number, stopTenths: number | null) => {
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

const main = async () => {
  const frozen = readJson<{ finalists: { label: string; cfg: Cfg }[]; newL0: { cfg: Cfg } }>(frozenSelectionFile);
  const door = await openStudyDoor('D24', 'report-only tail stress (in-sample 2016-2024)');
  const own: Record<'GDX' | 'VGT', Daily> = { GDX: fromDataset(door.sym.GDX.ds), VGT: fromDataset(door.sym.VGT.ds) };
  const proxies = { VGT: await loadProxy('XLK'), GDX: await loadProxy('GDXJ') };
  const rows = [...frozen.finalists, { label: 'control: New L0', cfg: frozen.newL0.cfg }].map((f) => ({
    label: f.label,
    cell: f.cfg.cell,
    books: Object.fromEntries(
      (['GDX', 'VGT'] as const).map((s) => {
        const h = holdOf(f.cfg, s);
        const d = controlValuesOf(f.cfg, s).d ?? null;

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
  }));
  const out = {
    labels: { inSample: 'in-sample stress (examined history 2016–2024; not evidence from unseen history)', proxy: 'proxy, same period, not disjoint', precision: 'daily-bar approximation (no minute precision is claimed)' },
    proxies: { XLK: { sha256: proxies.VGT.sha256, jumpsOver25pct: proxies.VGT.jumps }, GDXJ: { sha256: proxies.GDX.sha256, jumpsOver25pct: proxies.GDX.jumps } },
    rows
  };

  if (dry) console.log(JSON.stringify(out, null, 1).slice(0, 6000));
  else writeDiagnostic('tail-stress', out);
};

await main();
