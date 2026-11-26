// P8-GDX report-only diagnostics (PROTOCOL.md §16) — NON-OFFICIAL (GPU_POLICY_PURPOSE=diagnostic), run ONLY after the
// validation record is sealed and committed (the door guard refuses FULL otherwise). Never a selection, ranking or
// qualification input; every output is labelled report-only.
//   bh        GDX buy-and-hold controls (financed at 11 % simple and unfinanced), $100,000 at the 2016-01-04 first regular
//             minute's open + 5 bps, marked at every regular minute close: development, validation, full; exposure-normalized
//   tail      the D1 maximum-hold-window tail stress (standard §5.9) for every finalist's D1 book: pre-2016 GDX daily
//             (Yahoo, 2010-06-29 → 2015-12-31; disjoint) and in-sample 2016–2024 (D24 sessions); and the gap through a
//             protective stop
//   lots      CPU detailed replays (the canonical engine, purpose diagnostic) of the C24 finalists, fold primaries and
//             controls on FULL with the 2024-12-31 boundary: per-lot giveback (best mark − final net), durations, slot
//             occupancy, refused decisions by occupant (displacement), worst trades, the realized / marked principal-loss
//             view per lot, and illustrative margin scenarios
//   nbhd      the finalists' small (0.5×) and wide (1.5×) neighbourhood families on D24 (non-official GPU): breach shares and
//             tails beside the main radius
// GDX8_DIAG_TEST=D19 — an engineering test of this tool only, during the chain: C19's sealed selection stands in for C24's,
// D19 for FULL and D24, 2018-12-31 for the development end, the CPU for the GPU (nbhd); outputs go to cache/diag-test
// (git-ignored), never to a report
import fs from 'node:fs';
import path from 'node:path';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { wilson } from '../../src/vg-d1-growth-diagnostic/risk.ts';
import { quantile } from '../../src/vg-d1-growth-joint/fitness.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { fidelity } from '../../src/vg-l0-risk-families/qualify.ts';
import { type ArmKey, type CutoffKey, type DoorName, armOptions, ceiling, chronology, cutoffKeys, cutoffs, foldKeys, researchDir, resultsDir } from '../../src/gdx-d1-growth/context.ts';
import * as S from '../../src/gdx-d1-growth/space.ts';
import type { Cfg } from '../../src/gdx-d1-growth/space.ts';
import { drawsOf, famOf } from '../../src/gdx-d1-growth/qualify.ts';
import type { Evidence } from '../../src/gdx-d1-growth/qualify.ts';
import { ensureAllFrozen } from '../../src/gdx-d1-growth/stages.ts';
import { doorSessions, frozenSelectionFile, openGdxDoor, sliceFile } from '../../src/gdx-d1-growth/doors.ts';
import { isSealed } from '../../src/gdx-d1-growth/records.ts';
import { openToolLab, purposeOf, writeJson } from './common.ts';

const args = process.argv.slice(2);
const cmd = args[0];
const test = process.env.GDX8_DIAG_TEST === 'D19';
const diagDir = test ? path.join(researchDir, 'cache', 'diag-test') : path.join(researchDir, 'reports', 'diagnostics');
const fullDoor: DoorName = test ? 'D19' : 'FULL';
const inSampleDoor: DoorName = test ? 'D19' : 'D24';
const devEnd = test ? '2018-12-31' : chronology.developmentEnd;
const valStart = test ? '2019-01-02' : chronology.validationStart;
const endpoint = test ? '2019-12-31' : chronology.endpoint;
const lastCut: CutoffKey = test ? 'C19' : 'C24';
const cuts: readonly CutoffKey[] = test ? ['C19'] : cutoffKeys;
const tag = test ? 'ENGINEERING TEST of the diagnostics tool (D19 stand-in; not a report): ' : '';
const readJ = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const now = () => new Date().toISOString();

const requireValidation = () => {
  if (test) {
    if (!isSealed(path.join(resultsDir, 'selection', 'C19.json'))) throw new Error('the D19 test needs the sealed C19 selection');
    return;
  }
  if (!isSealed(sliceFile('C24'))) throw new Error('report-only diagnostics run only after the sealed validation');
};

// ----- the subjects: C24 finalists (FROZEN_SELECTION.json), the fold primaries, the external controls -----

interface Subject {
  label: string;
  arm: ArmKey;
  cfg: Cfg;
  roles: string[];
}

export const subjects = (): Subject[] => {
  ensureAllFrozen();

  const out = new Map<string, Subject>();
  const add = (label: string, arm: ArmKey, cfg: Cfg, role: string) => {
    const k = `${arm}|${label}`;
    const s = out.get(k);

    if (s) s.roles.push(role);
    else out.set(k, { label, arm, cfg: S.canonicalCfg(cfg), roles: [role] });
  };

  for (const cut of cuts) {
    const sel = readJ<{ primaries: Record<string, string | null>; roles: Record<string, { roles: Record<string, string | null> }>; subjects: Evidence[]; controls: Evidence[] }>(path.join(resultsDir, 'selection', `${cut}.json`));
    const byLabel = new Map(sel.subjects.map((e) => [e.label, e]));

    for (const a of ['D', 'G', 'C', 'J', 'S'] as const) {
      const l = sel.primaries[a];

      if (l) add(l, a, byLabel.get(l)!.cfg, `${cut} primary ${a}`);
      if (cut === lastCut)
        for (const [role, rl] of Object.entries(sel.roles[a]?.roles ?? {})) if (rl && role !== 'actual-profit') add(rl, a, byLabel.get(rl)!.cfg, `C24 role ${a}/${role}`);
    }
    if (cut === lastCut) for (const c of sel.controls) add(c.label, c.arm, c.cfg, 'control');
  }
  return [...out.values()];
};

// ----- buy-and-hold -----

const bh = async () => {
  purposeOf(['diagnostic']);
  requireValidation();

  const door = await openGdxDoor(fullDoor, 'diagnostic', `${tag}report-only buy-and-hold control`);
  const sessions = door.sym.VGT.history.length ? door.sym.VGT.history : (await doorSessions(fullDoor)).history;
  const first = sessions[0]!;
  const entryPrice = first.bars[0]!.open * 1.0005; // 5 bps inside the fill price, as the engine
  const shares = 100_000 / entryPrice;
  const entryDay = Date.parse(`${first.date}T00:00:00Z`) / 86_400_000;
  const legs = (financed: boolean) => {
    const marks: { date: string; t: number; v: number }[] = [];

    for (const s of sessions) {
      const day = Date.parse(`${s.date}T00:00:00Z`) / 86_400_000;
      const interest = financed ? (100_000 * 0.11 * (day - entryDay)) / 365 : 0;

      for (const b of s.bars) marks.push({ date: s.date, t: b.time, v: shares * b.close - 100_000 - interest });
    }
    return marks;
  };
  const stats = (marks: { date: string; v: number }[], from: string, to: string, base: number) => {
    const xs = marks.filter((m) => m.date >= from && m.date <= to);
    let peak = base;
    let dd = 0;

    for (const m of xs) {
      if (m.v > peak) peak = m.v;
      dd = Math.max(dd, peak - m.v);
    }
    return { pnl: r2(xs.at(-1)!.v - base), dd: r2(dd), ddPct: r4(dd / 100_000) };
  };
  const out: Record<string, unknown> = {};

  for (const financed of [true, false]) {
    const m = legs(financed);
    const devNet = m.filter((x) => x.date <= devEnd).at(-1)!.v;
    const yearsDev = (Date.parse(devEnd) - Date.parse(first.date)) / (365 * 86_400_000);

    out[financed ? 'financed11pct' : 'unfinanced'] = {
      development: { ...stats(m, chronology.firstSession, devEnd, 0), principalYears: r2(yearsDev), netPer100kYear: r2(devNet / yearsDev) },
      validation: stats(m, valStart, endpoint, devNet),
      full: stats(m, chronology.firstSession, endpoint, 0)
    };
  }

  // exposure-normalized controls: a fresh $100,000 bought at the first regular-minute open of each fold slice and of the
  // validation period (+ 5 bps), held to the window's last close — the scale of one strategy lot (the continuous 2016
  // holding above is many times larger by then, so its window P&L is not comparable with a $100,000 slot)
  const windows: [string, string, string][] = [...foldKeys.map((k): [string, string, string] => [`${k} slice`, cutoffs[k].slice[0], cutoffs[k].slice[1]]), ['validation', valStart, endpoint]];
  const fresh: Record<string, unknown> = {};

  for (const [name, from, to] of windows) {
    const ss = sessions.filter((s) => s.date >= from && s.date <= to);

    if (!ss.length) continue;
    const e = ss[0]!.bars[0]!.open * 1.0005;
    const sh = 100_000 / e;
    const d0 = Date.parse(`${ss[0]!.date}T00:00:00Z`) / 86_400_000;
    const per: Record<string, unknown> = { from: ss[0]!.date, to: ss.at(-1)!.date, entryPrice: r4(e), shares: r4(sh) };

    for (const financed of [true, false]) {
      const marks = ss.flatMap((s) => {
        const i = financed ? (100_000 * 0.11 * (Date.parse(`${s.date}T00:00:00Z`) / 86_400_000 - d0)) / 365 : 0;

        return s.bars.map((b) => ({ date: s.date, v: sh * b.close - 100_000 - i }));
      });

      per[financed ? 'financed11pct' : 'unfinanced'] = stats(marks, from, to, 0);
    }
    fresh[name] = per;
  }
  out.freshPurchase = fresh;

  const record = {
    kind: `${tag}GDX buy-and-hold control (report-only)`,
    basis: `$100,000 of GDX bought at the first regular-minute open of ${first.date} + 5 bps (${r4(entryPrice)} in 2016 share units; ${r4(shares)} shares), held to ${endpoint}, marked at every regular minute close; DD = the strict running-peak drawdown of the marked net in dollars of the fixed $100,000 allocation; financed: 11 % simple annual interest on $100,000 by calendar day (the strategies’ convention); unfinanced: no interest; no exit cost charged; freshPurchase: a new $100,000 bought at the first regular-minute open of each fold slice and of the validation period (+ 5 bps), held to the window’s last close, interest from that day (the exposure-normalized control at the scale of one strategy lot)`,
    ...out,
    finished: now()
  };

  writeJson(path.join(diagDir, 'buy-and-hold.json'), record);
  console.log(JSON.stringify(record));
};

// ----- the D1 hold-window tail stress (standard §5.9) -----

const tail = async () => {
  purposeOf(['diagnostic']);
  requireValidation();

  const y = readJ<{ chart: { result: { timestamp: number[]; indicators: { quote: { open: number[]; high: number[]; low: number[]; close: number[] }[] } }[] } }>(
    path.join(researchDir, 'cache', 'independent', 'yahoo-GDX-daily-2010-2024.json')
  ).chart.result[0]!;
  const q = y.indicators.quote[0]!;
  const ny = (t: number) => new Date((t - 5 * 3600) * 1000).toISOString().slice(0, 10);
  const pre = y.timestamp.map((t, i) => ({ date: ny(t), open: q.open[i]!, low: q.low[i]!, close: q.close[i]! })).filter((x) => x.date < '2016-01-01' && Number.isFinite(x.close));
  const d24 = (await doorSessions(inSampleDoor)).history.map((s) => ({ date: s.date, open: s.open, low: s.low, close: s.close }));
  const stress = (days: { date: string; open: number; low: number; close: number }[], hold: number, stopPct: number | null) => {
    const t = days.map((d) => Date.parse(`${d.date}T00:00:00Z`) / 86_400_000);
    const losses: { date: string; loss: number }[] = [];
    let worstGap = 0;
    let worstGapAt = '';

    for (let i = 0; i < days.length; i++) {
      const e = days[i]!.close;
      let worst = 0;

      for (let j = i + 1; j < days.length && t[j]! - t[i]! <= hold; j++) {
        if (stopPct !== null) {
          const stop = e * (1 - stopPct);

          if (days[j]!.low <= stop) {
            // a gap through the stop fills at the open (no better than the stop)
            const fill = Math.min(stop, days[j]!.open);
            const excess = (stop - fill) / e;

            if (excess > worstGap) {
              worstGap = excess;
              worstGapAt = days[j]!.date;
            }
            worst = Math.min(worst, fill / e - 1);
            break;
          }
        }
        worst = Math.min(worst, days[j]!.low / e - 1);
      }
      losses.push({ date: days[i]!.date, loss: worst * 100_000 });
    }

    const xs = losses.map((x) => x.loss).sort((a, b) => a - b);
    const w = losses.reduce((a, x) => (x.loss < a.loss ? x : a), losses[0]!);

    return { entries: losses.length, worst: r2(w.loss), worstDate: w.date, p05: r2(quantile(xs, 0.05)), shareBeyondCeiling: r4(xs.filter((x) => -x > ceiling).length / xs.length), worstGapThroughStopPct: stopPct !== null ? r4(worstGap) : null, worstGapAt: stopPct !== null ? worstGapAt : null };
  };
  const rows = subjects()
    .filter((s) => S.hasD1(s.arm))
    .map((s) => {
      const c = S.cellOf(s.cfg.cell);
      const p = S.partsOf(s.cfg);
      const fam = c.d1!.family;
      const hold = fam === 'C' ? 60 : fam === 'D' ? Math.max(p.ctl.hx ?? 0, p.d1.maximumHoldDays + 3) : p.d1.maximumHoldDays;
      const stop = fam === 'A' ? null : (p.ctl.d ?? 0) / 1000;

      return {
        label: s.label,
        arm: s.arm,
        roles: s.roles,
        d1Family: `${fam}${c.d1!.gate ? 1 : 0}`,
        holdWindowDays: hold,
        holdNote: fam === 'C' ? 'hold disabled: a declared 60-calendar-day bound' : fam === 'D' ? 'adaptive hold: the extended bound' : 'calendar maximum hold',
        protectiveStopPct: stop,
        disjointPre2016: stress(pre, hold, stop),
        inSample2016to2024: stress(d24, hold, stop)
      };
    });
  const record = {
    kind: `${tag}D1 maximum-hold-window tail stress (standard §5.9; report-only)`,
    basis: 'loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled)',
    referenceHistory: 'pre-2016 GDX daily (Yahoo Finance, 2010-06-29 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24)',
    rows,
    finished: now()
  };

  writeJson(path.join(diagDir, 'tail-stress.json'), record);
  console.log(JSON.stringify(rows.map((r) => ({ label: r.label, pre: r.disjointPre2016.worst, ins: r.inSample2016to2024.worst }))));
};

// ----- lots: CPU detailed replays on FULL -----

const lots = async () => {
  purposeOf(['diagnostic']);
  requireValidation();

  const door = await openGdxDoor(fullDoor, 'diagnostic', `${tag}report-only lot-level replays of frozen subjects (CPU reference)`);
  const ds = door.sym.VGT.ds;
  const rows = subjects().map((s) => {
    const o = { ...armOptions[s.arm], boundaries: [devEnd] };
    const x = runWithControls2(door, quadOf(s.cfg), s.cfg.controls, o, true, false, { cache: false });
    const r = x.result;
    const days = (a: number, b: number) => (ds.sTime[b]! - ds.sTime[a]!) / 86400;
    const lotRows = r.lots.map((l) => {
      const exitS = l.open ? r.endIndex : l.fills.at(-1)!.s;

      return {
        book: l.book === 'D1:VGT' ? 'D1·GDX' : 'Growth·GDX',
        entry: door.dates[l.entryS]!,
        exit: l.open ? null : door.dates[exitS]!,
        reason: l.open ? 'open' : l.fills.at(-1)!.reason,
        days: r2(days(l.entryS, exitS)),
        net: r2(l.net),
        best: r2(l.best),
        worst: r2(Math.min(l.worst, l.net)),
        giveback: r2(Math.max(0, l.best - l.net)),
        interest: r2(l.interest),
        costs: r2(l.costs),
        period: door.dates[l.entryS]! > devEnd ? 'validation' : 'development'
      };
    });
    const closed = lotRows.filter((l) => l.exit !== null);
    const refused = r.funding.filter((f) => f.outcome === 'refused');
    const byOccupant: Record<string, number> = {};

    for (const f of refused) {
      const k = `${f.book === 'D1:VGT' ? 'D1' : 'Growth'} refused (${f.reason}) ← occupant ${f.occupantBook === 'D1:VGT' ? 'D1' : f.occupantBook === 'G:VGT' ? 'Growth' : (f.occupantBook ?? f.occupant)}`;

      byOccupant[k] = (byOccupant[k] ?? 0) + 1;
    }

    const held = Array.from(r.heldAtClose);
    const worstMae = Math.min(0, ...lotRows.map((l) => l.worst));
    // illustrative margin: the $100,000 lot fully financed; account cash E; equity E + V − 100,000 ≥ m × V at the worst mark
    const v = 100_000 + worstMae;
    const margin = [0.25, 0.3, 0.5].map((m) => ({ maintenance: m, cashNeededAtWorstMark: r2(Math.max(0, 100_000 - (1 - m) * v)) }));

    return {
      label: s.label,
      arm: s.arm,
      roles: s.roles,
      cell: s.cfg.cell,
      describe: S.describeCfg(s.cfg),
      net: r2(r.net),
      lots: lotRows.length,
      wins: closed.filter((l) => l.net > 0).length,
      losses: closed.filter((l) => l.net < 0).length,
      winRate: closed.length ? r4(closed.filter((l) => l.net > 0).length / closed.length) : null,
      durationDays: { median: lotRows.length ? r2(quantile(lotRows.map((l) => l.days).sort((a, b) => a - b), 0.5)) : null, max: lotRows.length ? Math.max(...lotRows.map((l) => l.days)) : null },
      occupancy: { sessionsHeld: held.filter((h) => h >= 0).length, sessions: held.length, share: r4(held.filter((h) => h >= 0).length / held.length) },
      giveback: { total: r2(lotRows.reduce((a, l) => a + l.giveback, 0)), max: r2(Math.max(0, ...lotRows.map((l) => l.giveback))), maxLot: lotRows.reduce<(typeof lotRows)[number] | null>((a, l) => (!a || l.giveback > a.giveback ? l : a), null) },
      worstTrades: [...closed].sort((a, b) => a.net - b.net).slice(0, 5),
      bestTrades: [...closed].sort((a, b) => b.net - a.net).slice(0, 3),
      worstMarkedLotExcursion: r2(worstMae),
      openAtEnd: lotRows.filter((l) => l.exit === null),
      decisions: Object.fromEntries(Object.entries(r.decisions).filter(([b]) => b.endsWith('VGT')).map(([b, d]) => [b === 'D1:VGT' ? 'D1·GDX' : 'Growth·GDX', d])),
      refusedByOccupant: byOccupant,
      marginIllustrative: margin,
      lotRows
    };
  });
  const record = {
    kind: `${tag}lot-level replays (CPU reference engine, purpose diagnostic; report-only)`,
    basis: 'each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules)',
    rows,
    finished: now()
  };

  writeJson(path.join(diagDir, 'lots.json'), record);
  console.log(JSON.stringify(rows.map((r) => ({ label: r.label, lots: r.lots, giveback: r.giveback.max, occupancy: r.occupancy.share }))));
};

// ----- nbhd: small and wide families of the C24 finalists on D24 (non-official GPU) -----

const nbhd = async () => {
  purposeOf(['diagnostic']);
  requireValidation();

  const sel = readJ<{ subjects: Evidence[]; primaries: Record<string, string | null> }>(path.join(resultsDir, 'selection', `${lastCut}.json`));
  const fz = test
    ? { finalists: Object.entries(sel.primaries).flatMap(([arm, label]) => (label ? [{ label, arm: arm as ArmKey }] : [])) }
    : readJ<{ finalists: { label: string; arm: ArmKey }[] }>(frozenSelectionFile);
  const byLabel = new Map(sel.subjects.map((e) => [`${e.arm}|${e.label}`, e]));

  ensureAllFrozen();

  const t = await openToolLab({ backend: test ? 'cpu' : 'gpu', cpuWorkers: 4, door: inSampleDoor, use: 'diagnostic', area: test ? 'diag-test' : 'diagnostics', job: `nbhd-${inSampleDoor}${test ? '-test' : ''}`, purpose: `${tag}diagnostic: small and wide families`, ledger: path.join(diagDir, `nbhd-${inSampleDoor}-receipts.jsonl`) });
  const rows: Record<string, unknown>[] = [];

  try {
    for (const f of fz.finalists) {
      const e = byLabel.get(`${f.arm}|${f.label}`);

      if (!e) continue;

      const cfg = S.canonicalCfg(e.cfg);
      const o = armOptions[f.arm];
      const fams: Record<string, ReturnType<typeof drawsOf>> = {
        small: drawsOf(cfg, famOf('small', ['small', 1, lastCut], 0.5, fidelity.n)),
        wide: drawsOf(cfg, famOf('wide', ['wide', 1, lastCut], 1.5, fidelity.n))
      };
      const out: Record<string, unknown> = { label: f.label, arm: f.arm };

      for (const [k, draws] of Object.entries(fams)) {
        const recs = await t.lab.evalMany<SRec>(draws.map((d) => ({ cfg: d.cfg, options: o })), `nbhd ${k}`);
        const dds = recs.map((r) => (r.error ? Infinity : r.dd)).sort((a, b) => a - b);
        const nets = recs.map((r) => (r.error ? -100_000 : r.net)).sort((a, b) => a - b);
        const n = dds.length;
        const b = dds.filter((d) => d > ceiling).length;
        const kk = Math.max(1, Math.ceil(0.1 * n));

        out[k] = { draws: n, medianNet: r2(quantile(nets, 0.5)), p10Net: r2(quantile(nets, 0.1)), p90Dd: r2(quantile(dds, 0.9)), p95Dd: r2(quantile(dds, 0.95)), worstDd: r2(dds.at(-1)!), worst10MeanDd: r2(dds.slice(n - kk).reduce((a, x) => a + x, 0) / kk), breaches: b, breachShare: r4(b / n), wilson95: wilson(b, n) };
      }
      rows.push(out);
    }
  } finally {
    await t.close();
  }

  writeJson(path.join(diagDir, 'nbhd-small-wide.json'), { kind: `${tag}small (0.5×) and wide (1.5×) neighbourhood families of the C24 finalists on D24 (non-official GPU; report-only; standard §5.8)`, rows, finished: now() });
  console.log(JSON.stringify(rows.length));
};

const main = async () => {
  switch (cmd) {
    case 'bh':
      return bh();
    case 'tail':
      return tail();
    case 'lots':
      return lots();
    case 'nbhd':
      return nbhd();
    default:
      throw new Error(`unknown command ${cmd ?? ''} (bh | tail | lots | nbhd)`);
  }
};

await main();
