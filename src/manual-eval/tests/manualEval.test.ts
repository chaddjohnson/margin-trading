// Historical reproducibility and manual windows on the real canonical VGT/GDX files (skipped without the git-ignored
// data/): Priority 3's FULL door is the recorded historical input whatever was appended (its arrays equal the
// fingerprint captured before any change, 2026-11-27); N/original replays to its sealed figures on it; a run on all
// available data equals FULL decision for decision through 2026-10-30 (the causal trajectory); the GPU's input (the
// exported dataset) of FULL is byte-identical to the one the accepted GPU study exported; manual windows end at the
// common complete endpoint and refuse later dates. Synthetic files check the endpoint of two files that end apart.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import fs from 'fs-extra';
import { exportDataset } from '../../gpu-backend/dataset.ts';
import { csvText, sessionsBetween, syntheticRows } from '../../lib/tests/fixtures/syntheticMinutes.ts';
import { repoRoot } from '../../vg-d1-growth-joint/context.ts';
import { vOptions } from '../../vg-l0-full-joint/nl0.ts';
import { replay, toLedger } from '../../vg-l0-risk-metrics/engine.ts';
import { auditSubjects } from '../../vg-l0-risk-metrics/subjects.ts';
import { doorFingerprint } from '../../../tools/data-boundaries/fingerprint.ts';
import { openManualDoor, resolveManualWindow } from '../door.ts';
import { compareTrajectories, periodMetrics } from '../report.ts';

const hasData = ['VGT', 'GDX'].every((s) => fs.existsSync(path.join(repoRoot, 'data', s, 'data.csv')));
const recorded = path.join(repoRoot, 'docs/data-updates/2026-11-27/evidence/fingerprint-0-before-change.json');
const acceptedFull = path.join(repoRoot, 'research/gpu-phase7/cache/FULL.gb2ds.json');
const temps: string[] = [];

after(() => {
  for (const t of temps) fs.removeSync(t);
});

describe('manual windows: the common complete endpoint of two files that end apart (synthetic)', () => {
  test('all ends at the earlier file’s last complete session; a later custom end is refused', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-window-'));

    temps.push(root);
    fs.outputFileSync(
      path.join(root, 'GDX', 'data.csv'),
      csvText(syntheticRows(sessionsBetween('2026-10-26', '2026-11-25')))
    );
    fs.outputFileSync(
      path.join(root, 'VGT', 'data.csv'),
      csvText(syntheticRows(sessionsBetween('2026-10-26', '2026-11-20')))
    );

    const all = resolveManualWindow({ mode: 'all' }, root);

    assert.deepEqual([all.to, all.endpoint.limitedBy, all.postValidation], ['2026-11-20', ['VGT'], true]);
    assert.throws(
      () => resolveManualWindow({ mode: 'custom', to: '2026-11-25' }, root),
      /after the latest common complete session of GDX, VGT \(2026-11-20, limited by VGT\)/
    );
    assert.equal(
      resolveManualWindow({ mode: 'custom', from: '2025-01-02', to: '2026-11-03' }, root).from,
      '2025-01-02'
    );
    assert.throws(
      () => resolveManualWindow({ mode: 'custom', from: '2026-11-04', to: '2026-11-03' }, root),
      /after --to/
    );
    assert.throws(() => resolveManualWindow({ mode: 'all', to: '2026-11-03' }, root), /need --window custom/);
    assert.equal(resolveManualWindow({ mode: 'research' }, root).to, '2026-10-30');
  });
});

describe('historical reproducibility on the real files', { skip: hasData ? false : 'no local data' }, () => {
  test('FULL is the recorded historical input; N/original replays to its sealed figures on it', async () => {
    const full = await openManualDoor(
      resolveManualWindow({ mode: 'research' }),
      'test: FULL reproducibility (report-only)'
    );
    const before = JSON.parse(fs.readFileSync(recorded, 'utf8'));

    assert.deepEqual(doorFingerprint(full), before.doors.FULL.fingerprint);

    const nor = auditSubjects().find((s) => s.key === 'N/original')!;
    const r = replay(full, nor.subject, vOptions, ['2024-12-31']);

    assert.deepEqual(
      [Math.round(r.rec.net * 100) / 100, Math.round(r.rec.dd * 100) / 100, r.rec.lots, r.rec.signature],
      [482700.73, 20385.99, 44, '54d1c2e07c2dbbfd']
    );
    assert.deepEqual(
      r.rec.periods,
      before.doors.FULL.replays.find((x: { key: string }) => x.key === 'N/original').periods
    );
  });

  test('all available data: the run equals FULL decision for decision through 2026-10-30; the newer sessions only follow', async () => {
    const w = resolveManualWindow({ mode: 'all' });
    const nor = auditSubjects().find((s) => s.key === 'N/original')!;
    const fullDoor = await openManualDoor(resolveManualWindow({ mode: 'research' }), 'test: trajectory (report-only)');
    const allDoor = await openManualDoor(w, 'test: trajectory (report-only)');
    const short = replay(fullDoor, nor.subject, vOptions, ['2024-12-31']);
    const long = replay(allDoor, nor.subject, vOptions, ['2024-12-31', ...(w.postValidation ? ['2026-10-30'] : [])]);
    const check = compareTrajectories({ r: short, L: toLedger(short) }, { r: long, L: toLedger(long) });

    assert.equal(allDoor.dates.at(-1), w.endpoint.date);
    assert.deepEqual(check.differences, []);
    if (w.postValidation) {
      const a = periodMetrics(toLedger(long), allDoor, { key: 'A', label: 'A', after: null, through: '2026-10-30' });

      assert.deepEqual([a.net, a.lots.entered], [482700.73, 44]);
      assert.ok(allDoor.dates.some((d) => d > '2026-10-30'));
    }
  });

  test(
    'the GPU input: FULL exported as the GPU dataset is byte-identical to the accepted GPU study’s export',
    { skip: fs.existsSync(acceptedFull) ? false : 'no accepted export' },
    async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-dataset-'));

      temps.push(dir);

      const full = await openManualDoor(
        resolveManualWindow({ mode: 'research' }),
        'test: GPU dataset export (report-only)'
      );
      const out = exportDataset(full, dir);
      const accepted = JSON.parse(fs.readFileSync(acceptedFull, 'utf8'));

      assert.equal(out.sha256, accepted.fileSha256);
      assert.deepEqual(out.dataSha256, accepted.dataSha256);
    }
  );
});
