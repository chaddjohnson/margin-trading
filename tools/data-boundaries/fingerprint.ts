// A content fingerprint of Priority 3's doors (the arrays every VG/L0 evaluation, the GPU path and Strategy Lab's
// portfolios read) and exact replays of the sealed N/original and New L0 configurations on them. It proves that a change
// of the loaders, or an append to the canonical files, leaves the historical doors and results byte-identical.
// Read-only: the doors are opened quietly (no door log is written into any study), nothing else is written unless --out.
//
//   GPU_POLICY_PURPOSE=cpu-reference node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
//     --max-old-space-size=8192 tools/data-boundaries/fingerprint.ts [--doors FULL,D24] [--out FILE]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { type Door, openFullDoor, openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { frozenSelectionFile } from '../../src/vg-d1-growth-joint/context.ts';
import { p3 } from '../../src/vg-d1-growth-diagnostic/context.ts';
import { replay, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { auditSubjects } from '../../src/vg-l0-risk-metrics/subjects.ts';

const arg = (name: string) => {
  const i = process.argv.indexOf(name);

  return i > 0 ? process.argv[i + 1] : undefined;
};
const doorNames = (arg('--doors') ?? 'FULL,D24').split(',') as ('FULL' | 'D19' | 'D21' | 'D23' | 'D24')[];
const out = arg('--out');

const sha = () => createHash('sha256');
const typed = (h: ReturnType<typeof sha>, a: ArrayBufferView) =>
  h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
const num = (h: ReturnType<typeof sha>, xs: readonly number[]) => typed(h, Float64Array.from(xs));

export const doorFingerprint = (door: Door) => {
  const sym: Record<string, unknown> = {};

  for (const [s, d] of Object.entries(door.sym)) {
    const ds = d.ds as unknown as Record<string, unknown>;
    const arrays = sha();
    const scalars: Record<string, unknown> = {};

    for (const k of Object.keys(ds).sort()) {
      const v = ds[k];

      if (ArrayBuffer.isView(v)) {
        arrays.update(`${k}:`);
        typed(arrays, v);
      } else if (k === 'dates') arrays.update(`dates:${(v as string[]).join(',')}`);
      else scalars[k] = v;
    }

    const history = sha();

    for (const m of d.history) {
      history.update(`${m.date}|${m.isEarlyClose}|${m.closingPrint ?? 'none'}|`);
      num(history, [m.time, m.open, m.high, m.low, m.close, m.volume, m.openTime, m.closeTime]);
      for (const b of m.bars) num(history, [b.time, b.open, b.high, b.low, b.close, b.volume]);
    }

    sym[s] = {
      dataSha256: d.dataSha256,
      scalars,
      arraysSha256: arrays.digest('hex'),
      historySha256: history.digest('hex'),
      sessions: d.history.length,
      bars: d.history.reduce((n, m) => n + m.bars.length, 0),
      signalBarsSha256: sha().update(JSON.stringify(d.bars)).digest('hex'),
      first: d.history[0]?.date,
      last: d.history.at(-1)?.date
    };
  }

  return {
    name: door.name,
    from: door.from,
    to: door.to,
    sessions: door.sessions,
    datesSha256: sha().update(door.dates.join(',')).digest('hex'),
    sym
  };
};

const r2 = (x: number) => Math.round(x * 100) / 100;
const ledgerHash = (L: ReturnType<typeof toLedger>) =>
  sha()
    .update(
      JSON.stringify(
        L.lots.map((l) => [
          l.id,
          l.book,
          l.entryT,
          l.net,
          l.fills.map((f) => [f.t, f.net]),
          l.marks.length,
          l.marks.at(-1)?.pnl
        ])
      )
    )
    .digest('hex');

const main = async () => {
  const subjects = auditSubjects().filter((s) => s.key === 'N/original' || s.key === 'New L0');
  const doors: Record<string, unknown> = {};

  for (const name of doorNames) {
    const t0 = Date.now();
    const door =
      name === 'FULL'
        ? await openFullDoor(
            'fingerprint (read-only, report-only)',
            { file: frozenSelectionFile, sha256: p3.frozenSelectionSha256 },
            true
          )
        : await openPrefixDoor(name, 'fingerprint (read-only, report-only)', true);
    const boundaries = name === 'FULL' ? ['2024-12-31'] : [];
    const replays = subjects.map((s) => {
      const r = replay(door, s.subject, undefined, boundaries);
      const L = toLedger(r);

      return {
        key: s.key,
        net: r2(r.rec.net),
        dd: r2(r.rec.dd),
        lots: r.rec.lots,
        realized: r2(r.rec.realized),
        unrealized: r2(r.rec.unrealized),
        signature: r.rec.signature,
        periods: r.rec.periods,
        ledgerSha256: ledgerHash(L)
      };
    });

    doors[name] = { fingerprint: doorFingerprint(door), replays, seconds: (Date.now() - t0) / 1000 };
  }

  const record = {
    kind: 'door fingerprint (data-boundaries)',
    at: new Date().toISOString(),
    canonical: Object.fromEntries(
      ['VGT', 'GDX'].map((s) => {
        const f = path.join('data', s, 'data.csv');

        return [s, { bytes: fs.statSync(f).size, sha256: sha().update(fs.readFileSync(f)).digest('hex') }];
      })
    ),
    doors
  };
  const text = `${JSON.stringify(record, null, 1)}\n`;

  if (out) fs.writeFileSync(out, text);
  process.stdout.write(text);
};

if (import.meta.main) await main();
