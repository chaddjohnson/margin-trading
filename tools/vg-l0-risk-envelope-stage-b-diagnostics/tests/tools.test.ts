// RES-BD 1.0.0 tool tests (PROTOCOL.md §3, §6; AMENDMENTS D1 / D2 regressions). Run:
//   node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test tools/vg-l0-risk-envelope-stage-b-diagnostics/tests/*.test.ts
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { EvalLab } from '../../../src/gpu-backend/lab.ts';
import { deepDiff } from '../../../src/gpu-phase1/compare.ts';
import { vOptions } from '../../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, canonicalCfg, evalKeyOf } from '../../../src/vg-l0-full-joint/space.ts';
import { plain, readSealed, textOf } from '../../../src/vg-l0-risk-envelope-stage-b/records.ts';
import { STUDY_ID as STAGE_B_ID } from '../../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { qualificationFile } from '../../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { bankedDrawdown } from '../../../src/vg-l0-risk-metrics/metrics.ts';
import type { PathPoint } from '../../../src/vg-l0-risk-metrics/ledger.ts';
import { componentDrawdown } from '../../../src/risk-envelope/diagnostics.ts';
import { Rng } from '../../../src/optimizer/rng.ts';
import { makeCopy, openDiagDoor, refusingPool, sha256Stream } from '../common.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'resbd-test-'));

after(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('D1: hashing archives larger than 2 GiB', () => {
  it('readFileSync refuses a > 2 GiB file (the defect of Stage B census.ts); the streaming hash equals sha256sum', async () => {
    const f = path.join(tmp, 'sparse.bin');

    fs.writeFileSync(f, '');
    fs.truncateSync(f, 2 ** 31 + 2 ** 20); // sparse: 2 GiB + 1 MiB of zeros

    assert.throws(() => fs.readFileSync(f), (e: NodeJS.ErrnoException) => e.code === 'ERR_FS_FILE_TOO_LARGE');

    const mine = await sha256Stream(f);
    const ref = execFileSync('sha256sum', [f], { encoding: 'utf8' }).split(' ')[0];

    assert.equal(mine, ref);
    fs.rmSync(f);
  });
});

describe('D2: comparing a replayed lane with its sealed record', () => {
  it('the sealed encoding of non-finite numbers needs plain(), not a JSON.stringify round trip', () => {
    const value = { p90: Infinity, worst: -Infinity, x: NaN, rows: [{ p90: Infinity, net: 1.5 }] };
    const sealed = JSON.parse(textOf(value)) as unknown; // what readSealed returns

    // Stage B census.ts's comparison: a spurious difference for every non-finite number
    assert.ok(deepDiff(JSON.parse(JSON.stringify(sealed)), JSON.parse(JSON.stringify(value)), '$', [], 10).length > 0);
    // the corrected comparison (the store's encoding, as the record was written): identical
    assert.equal(deepDiff(sealed, plain(value), '$', [], 10).length, 0);
    // and a real difference is still detected
    assert.ok(deepDiff(sealed, plain({ ...value, rows: [{ p90: Infinity, net: 1.25 }] }), '$', [], 10).length > 0);
  });
});

describe('the archive replay evaluates nothing', () => {
  const sealed = readSealed<{ evidence: { cfg: Cfg }[] }>(qualificationFile('C19'));
  const cfgA = canonicalCfg(sealed.evidence[0]!.cfg);
  const cfgB = canonicalCfg(sealed.evidence[1]!.cfg);
  const binding = { backend: 'gpu:test', codeDigest: 'digest-A' };
  const open = (root: string, pool = refusingPool(), codeDigest = binding.codeDigest) =>
    new EvalLab({ study: STAGE_B_ID, job: 'C19-search', door: 'D19', doorPin: 'pin', purpose: 'test', pool: pool.pool, backend: binding.backend, codeDigest, cacheRoot: root });

  it('an archived key is read back; a missing key fails closed through the refusing pool (no fresh evaluation)', async () => {
    const root = path.join(tmp, 'lab1');
    const p = refusingPool();
    const lab = open(root, p);
    const rec = { net: 1, dd: 0, error: null, envelope: { bankedDdMarked: 0, bankedDdLiquidation: 0, principalLossMarked: 0, principalLossLiquidation: 0 } };

    lab.store.write('points', `${evalKeyOf('D19', cfgA, vOptions)}|risk`, rec);
    lab.store.commit();
    await lab.open();

    const rows = lab.store.count('points');
    const [got] = await lab.evalMany([{ cfg: cfgA, options: vOptions, risk: true }], 'test');

    assert.deepEqual(got, rec);
    assert.equal(lab.fresh, 0);
    assert.equal(p.calls.run, 0);
    await assert.rejects(lab.evalMany([{ cfg: cfgB, options: vOptions, risk: true }], 'test'), /not in the archive copy/);
    assert.equal(p.calls.run, 1);
    assert.equal(lab.fresh, 0);
    assert.equal(lab.store.count('points'), rows);
    await lab.close('test');
  });

  it('the archive refuses another code digest (identity binding)', async () => {
    const root = path.join(tmp, 'lab2');
    const lab = open(root);

    await lab.open();
    await lab.close('test');
    assert.throws(() => open(root, refusingPool(), 'digest-B'), /bound to codeDigest/);
  });
});

describe('verified copies', () => {
  it('a copy must equal the original and the baseline; a tampered copy is refused', async () => {
    const original = path.join(tmp, 'orig', 'archive.sqlite');
    const copy = path.join(tmp, 'copy', 'archive.sqlite');

    fs.mkdirSync(path.dirname(original), { recursive: true });

    const db = new DatabaseSync(original);

    db.exec('CREATE TABLE t (k TEXT PRIMARY KEY, v TEXT); INSERT INTO t VALUES (\'a\', \'1\');');
    db.close();

    const sha = await sha256Stream(original);
    const ok = await makeCopy('C19-search', { original, copy, expect: sha });

    assert.equal(ok.sha256, sha);
    assert.equal(ok.integrity, 'ok');
    await assert.rejects(makeCopy('C19-search', { original, copy, expect: '0'.repeat(64) }), /baseline/);
    fs.appendFileSync(copy, 'x');
    await assert.rejects(makeCopy('C19-search', { original, copy, expect: sha }), /copy's sha256/);
  });
});

describe('the zero-evaluation giveback bound (PROTOCOL §3.4)', () => {
  it('U ≥ DD − banked DD (marked) and U + E + F = DD on random one-slot paths', () => {
    const rng = Rng.from('res-bd-test', 'bound');

    for (let k = 0; k < 2000; k++) {
      const pts: PathPoint[] = [{ t: 0, date: '2016-01-04', m: 0, liq: 0, r: 0, lot: null }];
      let r = 0;
      let open = 0;

      for (let i = 1; i < 60; i++) {
        if (rng.next() < 0.15) {
          r += open; // a fill banks the open P&L
          open = 0;
        } else open += (rng.next() - 0.5) * 20_000;
        pts.push({ t: i, date: '2016-01-04', m: r + open, liq: r + open - 50, r, lot: open ? 0 : null });
      }

      const d3 = componentDrawdown(pts, null, 'marked');
      const bd = bankedDrawdown(pts, 'marked').max;
      const a = d3.account;

      assert.ok(Math.abs(a.unbankedGiveback + a.bankedErosion + a.capitalLoss - d3.dd) < 1e-6);
      assert.ok(a.unbankedGiveback >= d3.dd - bd - 1e-6, `U ${a.unbankedGiveback} < DD ${d3.dd} − BD ${bd}`);
      assert.ok(a.bankedErosion + a.capitalLoss <= bd + 1e-6);
    }
  });
});

describe('doors', () => {
  it('this diagnostic never opens D23 or FULL', async () => {
    await assert.rejects(openDiagDoor('FULL', 'test'), /only the training doors/);
    await assert.rejects(openDiagDoor('D23', 'test'), /only the training doors/);
  });
});
