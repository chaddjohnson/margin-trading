// gpu-phase1-feasibility unit tests. Interface and dataset checks run everywhere; the GPU checks run only where the
// research binary exists and a CUDA device answers (they are skipped otherwise, never faked).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import { runWithControls2 } from '../../d1-risk-controls-rc2/run.ts';
import { type Day, pathOf, crash, grid } from '../../d1-risk-controls/tests/scenarios.ts';
import { checksum32, exportDataset } from '../dataset.ts';
import { deepDiff } from '../compare.ts';
import { FEATURE, GpuError, GpuEvaluator, SIZES, defaultBinary } from '../gpu.ts';

const header = fs.readFileSync(path.join(import.meta.dirname, '..', 'cuda', 'gp1.h'), 'utf8');
// two symbols on one calendar: the crash path, and the same path scaled ×1.5 with every third session's minutes reversed
const scaled = (days: Day[]): Day[] =>
  days.map((d, i) => {
    const s = Array.isArray(d) ? { open: d[0]!, closes: d } : d;
    const closes = s.closes.map((c) => Math.round(c * 150) / 100);

    return { open: Math.round(s.open * 150) / 100, closes: i % 3 === 0 ? [...closes].reverse() : closes };
  });
const door = () => fixtureDoorOf('gpup1-unit', { GDX: pathOf(crash), VGT: pathOf(scaled(crash)) });
const gpuAvailable = (() => {
  if (!fs.existsSync(defaultBinary())) return false;
  try {
    return fs.existsSync('/dev/nvidia0');
  } catch {
    return false;
  }
})();

describe('gpu-phase1 interface (v1)', () => {
  it('the TypeScript struct sizes equal the header static_asserts', () => {
    const asserted = Object.fromEntries(
      [...header.matchAll(/static_assert\(sizeof\((\w+)\) == (\d+)/g)].map((m) => [m[1]!, Number(m[2])])
    );

    assert.deepEqual(
      {
        cand: asserted.Gp1CandIn,
        d1: asserted.Gp1D1In,
        trade: asserted.Gp1Trade,
        fill: asserted.Gp1Fill,
        out: asserted.Gp1CandOut,
        bookOut: asserted.Gp1BookOut,
        lot: asserted.Gp1Lot,
        lotFill: asserted.Gp1LotFill,
        batchHeader: asserted.Gp1BatchHeader,
        resultHeader: asserted.Gp1ResultHeader
      },
      {
        cand: SIZES.cand,
        d1: SIZES.d1,
        trade: SIZES.trade,
        fill: SIZES.fill,
        out: SIZES.out,
        bookOut: SIZES.bookOut,
        lot: SIZES.lot,
        lotFill: SIZES.lotFill,
        batchHeader: SIZES.batchHeader,
        resultHeader: SIZES.resultHeader
      }
    );
  });

  it('the dataset file carries the exact Dataset arrays and a verifiable checksum', () => {
    const d = door();
    const f = exportDataset(d, 'unit-test');
    const buf = fs.readFileSync(f.file);

    assert.equal(buf.subarray(0, 8).toString('latin1'), 'GP1DSET1');
    assert.equal(buf.readUInt32LE(16), d.sessions);
    assert.equal(Number(buf.readBigUInt64LE(32)), checksum32(buf, 48));
    // the first payload array is GDX's sTime, byte for byte
    assert.deepEqual(
      new Float64Array(buf.buffer.slice(buf.byteOffset + 48, buf.byteOffset + 48 + d.sessions * 8)),
      new Float64Array(d.sym.GDX.ds.sTime)
    );
    fs.rmSync(f.file);
    fs.rmSync(f.sidecar);
  });
});

describe(
  'gpu-phase1 GPU parity (skipped without the research binary and a CUDA device)',
  { skip: !gpuAvailable },
  () => {
    it('reproduces the CPU engine bit for bit on synthetic paths and refuses an unsupported option', async () => {
      const d = door();
      const f = exportDataset(d, 'unit-test-gpu');
      const gpu = GpuEvaluator.start({ vramBudgetMb: 256 });

      try {
        await gpu.load(f.file);

        const items = [0, 1, 2, 3].map((i) => ({
          key: `u${i}`,
          quad: {
            d1: { GDX: grid({ trailingBuyPercentage: 5 + i }), VGT: grid({ maximumHoldDays: 2 + i }) },
            g: { GDX: {}, VGT: {} },
            first: 'D1' as const
          },
          controls:
            i % 2
              ? {
                  version: 2 as const,
                  books: {
                    'D1:GDX': {
                      protectiveStop: { mode: 'on' as const, stopDistanceTenths: 40, activation: 'entry-day' as const }
                    }
                  }
                }
              : null,
          options: { enabled: { 'G:GDX': false, 'G:VGT': false } }
        }));
        const { results } = await gpu.evaluate(d, items, {
          returnTrades: true,
          returnLots: true,
          returnSeries: true,
          record: false,
          tradeCap: 64,
          lotCap: 64
        });

        results.forEach((r, i) => {
          const cpu = runWithControls2(d, items[i]!.quad, items[i]!.controls, items[i]!.options, false, false, {
            cache: false
          });

          assert.equal(r.status, 0);
          assert.deepEqual(deepDiff(cpu.result, r.pool), []);
          assert.deepEqual(deepDiff(cpu.books.find((b) => b.book === 'D1:GDX')!.trades, r.d1['D1:GDX']!.trades), []);
        });
        await assert.rejects(
          gpu.evaluate(d, items.slice(0, 1), { extraFeatures: FEATURE.GROWTH_ON_GPU }),
          (e) => e instanceof GpuError && e.status === 103
        );
      } finally {
        await gpu.close();
        fs.rmSync(f.file);
        fs.rmSync(f.sidecar);
      }
    });
  }
);
