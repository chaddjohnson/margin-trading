// Stage 0 (PROTOCOL.md §8, gate G0): provenance pins, the audited studies' seals, and the exact baseline parity of New
// L0 and N/original on FULL and D24 through the unchanged evaluation path, with the rebuilt ledger reconciled to the
// engine. Sealed once: results/baseline/parity.json.
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-metrics/baseline.ts [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { gId } from '../../src/vg-d1-growth-joint/space.ts';
import { cfgId } from '../../src/vg-l0-full-joint/space.ts';
import { repoRoot, resultsDir, r2 } from '../../src/vg-l0-risk-metrics/context.ts';
import { openDoor } from '../../src/vg-l0-risk-metrics/doors.ts';
import { reconcile, replay, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { markedDrawdown, portfolioPath } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { readJson, sealJson, sha256File, sha256Text } from '../../src/vg-l0-risk-metrics/records.ts';
import { auditSubjects, pins } from '../../src/vg-l0-risk-metrics/subjects.ts';
import { codeDigest, studyGuard } from './common.ts';

const dry = process.argv.includes('--dry');
const freeze = studyGuard();
const t0 = Date.now();

// ----- pins and the audited studies' seals -----
type Registry = { versions?: { version: string; sha256: string }[]; methods?: { id: string; versions: { version: string; sha256: string }[] }[] };
const registry = (file: string, key: string) => {
  const r = readJson<Registry>(path.join(repoRoot, file));

  return (r.versions ?? r.methods!.find((m) => m.id === 'NL0')!.versions).find((v) => v.version === key)!.sha256;
};
const verifySealLog = (dir: string) => {
  const rows = fs
    .readFileSync(path.join(repoRoot, dir, 'results/seals.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { file: string; sha256: string });
  const bad = rows.filter((r) => sha256File(path.join(repoRoot, r.file)) !== r.sha256).map((r) => r.file);

  return { records: rows.length, bad };
};
const provenance = {
  standard: { sha256: sha256File(path.join(repoRoot, 'docs/research/OPTIMIZATION_STANDARD.md')), registered220: registry('docs/research/optimization-standard.versions.json', '2.2.0') },
  nl0: { sha256: sha256File(path.join(repoRoot, 'docs/research/methods/NEW_L0_METHOD.md')), registered100: registry('docs/research/methods/methods.versions.json', '1.0.0') },
  seals: {
    'vg-l0-full-joint': verifySealLog('research/vg-l0-full-joint'),
    'vg-l0-risk-families': verifySealLog('research/vg-l0-risk-families'),
    'vg-lifecycle-matched-optimization': verifySealLog('research/vg-lifecycle-matched-optimization')
  },
  pinnedRecords: Object.fromEntries(Object.entries(pins).map(([k, p]) => [k, { file: path.relative(repoRoot, p.file), sha256: sha256File(p.file), expected: p.sha256 }]))
};

for (const [k, v] of Object.entries(provenance.seals)) if (v.bad.length) throw new Error(`${k}: ${v.bad.length} sealed record(s) fail`);
if (provenance.standard.sha256 !== provenance.standard.registered220) throw new Error('the standard is not the registered 2.2.0');
if (provenance.nl0.sha256 !== provenance.nl0.registered100) throw new Error('NL0 is not the registered 1.0.0');
for (const [k, v] of Object.entries(provenance.pinnedRecords)) if (v.sha256 !== v.expected) throw new Error(`${k}: sha256 differs`);

// ----- replays -----
const subjects = auditSubjects();
const nl0 = subjects.find((s) => s.key === 'New L0')!;
const nor = subjects.find((s) => s.key === 'N/original')!;
const full = await openDoor('FULL', 'Stage 0 parity: New L0 and N/original (fixed sealed configurations; previously examined history)');
const d24 = await openDoor('D24', 'Stage 0 parity: New L0 and N/original on development');
const boundary = '2024-12-31';
const b = full.dates.indexOf(boundary);
const ledgerHash = (L: ReturnType<typeof toLedger>) => sha256Text(JSON.stringify(L.lots.map((l) => [l.id, l.book, l.entryT, l.net, l.fills.map((f) => [f.t, f.net]), l.marks.length, l.marks.at(-1)?.pnl])));

const one = (s: (typeof subjects)[number]) => {
  const rf = replay(full, s.subject, undefined, [boundary]);
  const Lf = toLedger(rf);
  const recF = reconcile(rf, Lf);
  const rd = replay(d24, s.subject);
  const Ld = toLedger(rd);
  const recD = reconcile(rd, Ld);
  const p = rf.rec.periods[0]!;
  const ptsF = portfolioPath(Lf);
  const devFromFull = markedDrawdown(ptsF, 'marked', -Infinity, full.sym.VGT.ds.sCloseTime[b]!);
  const got = { net: r2(rf.rec.net), dd: r2(rf.rec.dd), lots: rf.rec.lots, developmentNet: r2(p.equity), validationPnl: r2(p.after), resetValidationDd: r2(p.dd) };
  const checks: Record<string, boolean> = {
    'FULL net = sealed': got.net === s.target.net,
    'FULL DD = sealed': got.dd === s.target.dd,
    'FULL lots = sealed': got.lots === s.target.lots,
    'development net (FULL at 2024-12-31) = sealed': got.developmentNet === s.target.developmentNet,
    '2025–2026 P&L = sealed': got.validationPnl === s.target.validationPnl,
    '2025–2026 reset DD = sealed': got.resetValidationDd === s.target.resetValidationDd,
    'causality: D24 net = FULL marked net at the 2024-12-31 close': r2(rd.rec.net) === got.developmentNet,
    'causality: D24 DD = FULL path DD through 2024-12-31': r2(rd.rec.dd) === r2(devFromFull.max)
  };

  return {
    key: s.key,
    label: s.label,
    provenance: s.provenance,
    id: s.cfg ? cfgId(s.cfg) : null,
    cell: s.cfg?.cell ?? null,
    growthVgtId: gId(s.subject.quad.g.VGT),
    full: { ...got, realized: r2(rf.rec.realized), unrealized: r2(rf.rec.unrealized), signature: rf.rec.signature, ddPeak: new Date(rf.result.dd.peakT * 1000).toISOString(), ddTrough: new Date(rf.result.dd.troughT * 1000).toISOString(), years: rf.rec.years, reconciliation: recF, ledgerSha256: ledgerHash(Lf) },
    development: { net: r2(rd.rec.net), dd: r2(rd.rec.dd), lots: rd.rec.lots, signature: rd.rec.signature, ddPeak: new Date(rd.result.dd.peakT * 1000).toISOString(), ddTrough: new Date(rd.result.dd.troughT * 1000).toISOString(), reconciliation: recD, ledgerSha256: ledgerHash(Ld) },
    target: s.target,
    checks,
    pass: Object.values(checks).every(Boolean),
    ledger: Lf
  };
};

const rows = [one(nl0), one(nor)];
const nl0Anchors = {
  'FULL $479,605.18': rows[0]!.full.net === 479605.18,
  'FULL DD $20,385.99': rows[0]!.full.dd === 20385.99,
  'FULL 46 lots': rows[0]!.full.lots === 46,
  'development $382,721.46': rows[0]!.development.net === 382721.46,
  'development DD $19,459.83': rows[0]!.development.dd === 19459.83,
  'development 34 lots': rows[0]!.development.lots === 34,
  'FULL realized $485,169.93': rows[0]!.full.realized === 485169.93,
  'FULL unrealized −$5,564.76': rows[0]!.full.unrealized === -5564.76,
  'ledger signature 7b17578108747911 (NL0 §1.1)': rows[0]!.full.signature === '7b17578108747911',
  'N/original FULL $482,700.73 / $20,385.99': rows[1]!.full.net === 482700.73 && rows[1]!.full.dd === 20385.99,
  'N/original 2025–2026 $94,669.70 (New L0 $96,883.72)': rows[1]!.full.validationPnl === 94669.7 && rows[0]!.full.validationPnl === 96883.72,
  'N/original development = its C24 evidence $388,031.02 / $19,459.83': rows[1]!.development.net === 388031.02 && rows[1]!.development.dd === 19459.83
};
// determinism: a second FULL replay of New L0 gives the identical rebuilt ledger
const again = toLedger(replay(full, nl0.subject, undefined, [boundary]));
const deterministic = ledgerHash(again) === rows[0]!.full.ledgerSha256;
const gate = rows.every((r) => r.pass) && Object.values(nl0Anchors).every(Boolean) && deterministic;
const diff = (() => {
  const a = nl0.subject.quad;
  const c = nor.subject.quad;
  const out: Record<string, unknown> = {};

  for (const s of ['GDX', 'VGT'] as const)
    for (const k of Object.keys(a.d1[s]) as (keyof (typeof a.d1)['GDX'])[]) if (a.d1[s][k] !== c.d1[s][k]) out[`D1·${s}.${k}`] = [a.d1[s][k], c.d1[s][k]];
  out['Growth·VGT identical'] = gId(a.g.VGT) === gId(c.g.VGT);
  out['Growth·VGT differing genes'] = Object.fromEntries(
    [...new Set([...Object.keys(a.g.VGT), ...Object.keys(c.g.VGT)])]
      .filter((k) => JSON.stringify((a.g.VGT as Record<string, unknown>)[k]) !== JSON.stringify((c.g.VGT as Record<string, unknown>)[k]))
      .map((k) => [k, [(a.g.VGT as Record<string, unknown>)[k], (c.g.VGT as Record<string, unknown>)[k]]])
  );
  out.controls = { newL0: nl0.subject.controls, nOriginal: nor.subject.controls };
  return out;
})();

const record = {
  stage: 'S0 baseline parity',
  gate: gate ? 'G0 PASS' : 'G0 FAIL',
  freeze: { protocol: freeze.protocol.sha256 },
  code: codeDigest(),
  provenance,
  doors: { FULL: { sessions: full.sessions, last: full.dates.at(-1), sha256: { GDX: full.sym.GDX.dataSha256, VGT: full.sym.VGT.dataSha256 } }, D24: { sessions: d24.sessions, last: d24.dates.at(-1) } },
  nl0Anchors,
  deterministic,
  nOriginalVersusNewL0: diff,
  rows: rows.map(({ ledger, ...r }) => ({ ...r, lotsTable: ledger.lots.map((l) => ({ id: l.id, book: l.book, kind: l.kind, entry: l.entryDate, entryRaw: l.entryRaw, exit: l.open ? null : l.fills.at(-1)!.date, reason: l.open ? 'open' : l.fills.at(-1)!.reason, partialFills: l.fills.filter((f) => f.partial).length, net: r2(l.net), interest: r2(l.interest), costs: r2(l.costs), canonicalMae: r2(l.canonicalMae!) })) })),
  seconds: (Date.now() - t0) / 1000,
  memoryRssMb: Math.round(process.memoryUsage().rss / 2 ** 20)
};

if (dry) console.log(JSON.stringify({ ...record, rows: record.rows.map((r) => ({ ...r, lotsTable: r.lotsTable.length })) }, null, 1));
else console.log(sealJson(path.join(resultsDir, 'baseline', 'parity.json'), record, 'S0 baseline parity'), record.gate);
if (!gate) process.exitCode = 1;
