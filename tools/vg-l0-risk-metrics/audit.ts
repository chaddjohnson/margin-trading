// Stage 3 (PROTOCOL.md §8): the retrospective metric audit of the sealed candidates.
//   centres          — every audit subject (New L0, Assignment 3's 48 finalists, Assignment 2's C24 primaries) on FULL
//                      (boundary 2024-12-31): parity with its sealed FULL net and DD (a failure stops the stage), the
//                      reconciled ledger, the stop reconstruction gate G-S, and the metric bundle (development,
//                      2025–2026 reset, full; the 2020, 2022 and 2025 episodes; the cutoff and end exposures).
//   nbhd <key> <door> — one key candidate's C24 SELECTION family (2 × 128 draws, regenerated with Assignment 3's own
//                      drawsOf/famOf and seeds; never a search) replayed on D24 or FULL: the new metrics' distributions
//                      and the attribution of every breach; the regenerated family must reproduce the sealed p90 DD.
//   node --experimental-transform-types tools/vg-l0-risk-metrics/audit.ts centres | nbhd "N/original" D24 [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { drawsOf, famOf } from '../../src/vg-l0-full-joint/qualify.ts';
import { canonicalCfg } from '../../src/vg-l0-full-joint/space.ts';
import { fullJoint, resultsDir, r2 } from '../../src/vg-l0-risk-metrics/context.ts';
import { type DoorKey, openDoor } from '../../src/vg-l0-risk-metrics/doors.ts';
import { reconcile, replay, subjectOfCfg, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { bundleOf } from '../../src/vg-l0-risk-metrics/bundle.ts';
import { attributeDrawdown, bankedDrawdown, floorShortfall, markedDrawdown, portfolioPath, realizedDrawdown, tail, tradeRisk } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { sealJson } from '../../src/vg-l0-risk-metrics/records.ts';
import { auditSubjects } from '../../src/vg-l0-risk-metrics/subjects.ts';
import { codeDigest, studyGuard } from './common.ts';
import { auditOptions } from './audit-options.ts';

const dry = process.argv.includes('--dry');
const args = process.argv.slice(2).filter((a) => a !== '--dry');
const freeze = studyGuard();
const t0 = Date.now();
const emit = (rel: string, v: unknown, label: string) => {
  if (dry) return console.log(JSON.stringify(v, null, 1).slice(0, 6000));
  console.log(rel, sealJson(path.join(resultsDir, rel), v, label));
};

const centres = async () => {
  const full = await openDoor('FULL', 'Stage 3: audit of fixed sealed candidates on FULL (previously examined history)');
  const rows: Record<string, unknown>[] = [];
  let failures = 0;

  for (const s of auditSubjects()) {
    const r = replay(full, s.subject, undefined, ['2024-12-31']);
    const L = toLedger(r);
    const rc = reconcile(r, L);
    const p = r.rec.periods[0]!;
    const parity = r2(r.rec.net) === s.target.net && r2(r.rec.dd) === s.target.dd && r.rec.lots === s.target.lots && r2(p.after) === s.target.validationPnl && r2(p.dd) === s.target.resetValidationDd;

    if (!parity) failures++;

    const b = bundleOf(full, r, L, portfolioPath(L), auditOptions);

    if (b.stopVerification.failed) failures++;
    rows.push({ key: s.key, label: s.label, provenance: s.provenance, cell: s.cfg?.cell ?? null, parity, reconciliation: rc, target: s.target, ...b });
    console.log(`${s.key}: parity ${parity}, stops ${b.stopVerification.checked}/${b.stopVerification.failed} failed, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  if (failures) throw new Error(`${failures} parity or stop-verification failure(s): stage stopped (nothing sealed)`);
  emit('audit/centres.json', { stage: 'S3 candidate audit (FULL)', freeze: freeze.protocol.sha256, code: codeDigest(), options: auditOptions, subjects: rows.length, rows, seconds: (Date.now() - t0) / 1000, memoryRssMb: Math.round(process.memoryUsage().rss / 2 ** 20) }, 'S3 candidates (FULL)');
};

type Ev = { label: string; select: { p90Dd: number; robust: number }; selectTail: { p90Dd: number; worst10Mean: number; breachShare: number; worstDd: number } };

const sealedSelect = (label: string): Ev['selectTail'] => {
  const dir = path.join(fullJoint.dir, 'results/folds/C24');

  if (label.startsWith('New L0')) return decode<{ control: Ev }>(fs.readFileSync(path.join(dir, 'selection.json'), 'utf8')).control.selectTail;
  for (const st of ['broad', 'refine', 'informed']) {
    const e = decode<{ evidence: Ev[] }>(fs.readFileSync(path.join(dir, `${st}-qualification.json`), 'utf8')).evidence.find((x) => x.label === label);

    if (e) return e.selectTail;
  }
  throw new Error(`no sealed evidence for ${label}`);
};

const nbhd = async (key: string, doorKey: DoorKey) => {
  const s = auditSubjects().find((x) => x.key === key);

  if (!s?.cfg) throw new Error(`${key}: not an Assignment 3 configuration (no regenerable family)`);

  const door = await openDoor(doorKey, `Stage 3: ${key}'s sealed C24 selection family regenerated (report-only)`);
  const cfg = canonicalCfg(s.cfg);
  const seen = new Set<string>();
  const draws = [1, 2].flatMap((rep) => drawsOf(cfg, famOf('select', ['select', rep, 'C24']))).filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
  const boundary = doorKey === 'FULL' ? ['2024-12-31'] : [];
  const out: Record<string, number | string | null>[] = [];

  for (const d of draws) {
    const r = replay(door, subjectOfCfg(d.cfg), undefined, boundary);
    const L = toLedger(r);
    const pts = portfolioPath(L);
    const dd = markedDrawdown(pts);

    if (Math.abs(dd.max - r.result.dd.max) > 1e-6 * Math.max(1, r.result.dd.max)) throw new Error(`draw ${d.id}: rebuilt DD differs`);

    const a = attributeDrawdown(L, dd.peakT, dd.troughT);
    const tr = L.lots.map((l) => tradeRisk(l, L.endT));

    out.push({
      id: d.id,
      net: r.rec.net,
      dd: dd.max,
      ddPeak: dd.peakDate,
      ddTrough: dd.troughDate,
      ddGiveback: a.profitGiveback,
      ddPrincipal: a.principalLoss,
      principalLossMax: Math.max(0, ...tr.map((x) => x.principalLossLiq)),
      bankedDd: bankedDrawdown(pts).max,
      floorShortfall: floorShortfall(pts, 'liquidation').shortfall,
      realizedDd: realizedDrawdown(pts).max,
      maxGiveback: Math.max(0, ...tr.map((x) => x.maxGivebackAboveBreakeven)),
      resetDd2025: doorKey === 'FULL' ? r.rec.periods[0]!.dd : null,
      pnl2025: doorKey === 'FULL' ? r.rec.periods[0]!.after : null
    });
  }

  const col = (k: string) => out.map((x) => x[k] as number);
  const sealed = sealedSelect(s.label);
  const ddT = tail(col('dd').map(r2)); // the audited instrument's statistics are taken over cent-rounded record DDs
  const breaches = out.filter((x) => (x.dd as number) > 35_000);
  const record = {
    stage: `S3 neighbourhood ${key} on ${doorKey}`,
    freeze: freeze.protocol.sha256,
    code: codeDigest(),
    key,
    label: s.label,
    family: "Assignment 3's C24 selection family: drawsOf(cfg, famOf('select', ['select', rep, 'C24'])), rep 1 and 2, duplicates dropped",
    draws: out.length,
    parity: doorKey === 'D24' ? { regeneratedP90Dd: r2(ddT.p90), sealedP90Dd: sealed.p90Dd, regeneratedWorst10Mean: r2(ddT.worst10Mean), sealedWorst10Mean: sealed.worst10Mean, equal: r2(ddT.p90) === r2(sealed.p90Dd) && r2(ddT.worst10Mean) === r2(sealed.worst10Mean) } : null,
    distributions: Object.fromEntries(['net', 'dd', 'ddGiveback', 'ddPrincipal', 'principalLossMax', 'bankedDd', 'floorShortfall', 'realizedDd', 'maxGiveback', ...(doorKey === 'FULL' ? ['resetDd2025', 'pnl2025'] : [])].map((k) => [k, tail(col(k))])),
    breaches: {
      count: breaches.length,
      share: breaches.length / out.length,
      givebackShareOfBreachDd: breaches.length ? breaches.reduce((a, x) => a + (x.ddGiveback as number), 0) / breaches.reduce((a, x) => a + (x.dd as number), 0) : null,
      principalLossMaxOfBreaches: breaches.length ? Math.max(...breaches.map((x) => x.principalLossMax as number)) : null,
      bankedDdOver35k: out.filter((x) => (x.bankedDd as number) > 35_000).length,
      principalLossOver35k: out.filter((x) => (x.principalLossMax as number) > 35_000).length,
      principalLossOver25k: out.filter((x) => (x.principalLossMax as number) > 25_000).length,
      rows: breaches
    },
    rows: out,
    seconds: (Date.now() - t0) / 1000,
    memoryRssMb: Math.round(process.memoryUsage().rss / 2 ** 20)
  };

  if (record.parity && !record.parity.equal) throw new Error(`${key}: the regenerated family does not reproduce the sealed p90 DD (${JSON.stringify(record.parity)})`);
  emit(`audit/nbhd-${key.replace(/[^A-Za-z0-9]+/g, '_')}-${doorKey}.json`, record, `S3 neighbourhood ${key} ${doorKey}`);
};

if (args[0] === 'centres') await centres();
else if (args[0] === 'nbhd') await nbhd(args[1]!, args[2] as DoorKey);
else console.error('usage: audit.ts centres | nbhd <key> <D24|FULL> [--dry]');
