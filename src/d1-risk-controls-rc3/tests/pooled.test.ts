// The pooled staged evaluation on the development door D24 (real data; skipped without the git-ignored doors). OFF is the
// existing evaluation: evaluateStaged(null / empty) returns Assignment 2's record byte for byte, reproducing the frozen
// comparators' sealed development figures (New L0 a2e385640ca61012 $382,721.46 / DD $19,459.83; N/original
// rc1-f1a8b57cb02455c3 $388,031.02 / $19,459.83) and their identities; Priority 3's runGrowthBook with `staged: null`
// equals the call without it. ON: an "st1-" identity, the per-book counters, the existing RC summaries, a detailed
// replay equal to the search record, determinism, and evaluation-key separation.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { openPrefixDoor } from '../../vg-d1-growth-joint/data.ts';
import { baseFriction, runGrowthBook } from '../../vg-d1-growth-joint/books.ts';
import { runGrowthBookStaged } from '../growth.ts';
import { evaluate } from '../../vg-l0-risk-families/evaluate.ts';
import { type Cfg, cfgId, evalKeyOf, quadOf } from '../../vg-l0-full-joint/space.ts';
import { vOptions } from '../../vg-l0-full-joint/nl0.ts';
import { readJson } from '../../vg-l0-full-joint/records.ts';
import { repoRoot } from '../../vg-l0-full-joint/context.ts';
import type { StagedConfig } from '../../staged-stop/config.ts';
import { evaluateStaged, evaluateStagedDetail, stagedCfgId, stagedEvalKey } from '../run.ts';

const frozen = readJson<{ newL0: { cfg: Cfg }; finalists: { label: string; id: string; cfg: Cfg }[] }>(
  `${repoRoot}/research/vg-l0-full-joint/FROZEN_SELECTION.json`
);
const newL0 = frozen.newL0.cfg;
const nOriginal = frozen.finalists.find((f) => f.id === 'rc1-f1a8b57cb02455c3')!.cfg;
const hasDoors = existsSync(`${repoRoot}/.cache/vg-d1-growth-joint/doors/VGT-D24.csv`);
const ON: StagedConfig = {
  version: 1,
  books: {
    'D1:GDX': { activationTenths: 120, stage2Tenths: 30 },
    'D1:VGT': { activationTenths: 150, stage2Tenths: 40 },
    'G:VGT': { activationTenths: 150, stage2Tenths: 30 }
  }
};

describe('pooled staged evaluation on D24', { skip: !hasDoors && 'no local doors' }, () => {
  it('OFF = the existing record, byte for byte, with the sealed development figures', async () => {
    const door = await openPrefixDoor('D24', 'test: staged OFF parity', true);

    for (const [cfg, id, net, dd] of [
      [newL0, 'a2e385640ca61012', 382721.46, 19459.83],
      [nOriginal, 'rc1-f1a8b57cb02455c3', 388031.02, 19459.83]
    ] as const) {
      const q = quadOf(cfg);
      const base = evaluate(door, q, cfg.controls, vOptions);

      for (const st of [null, undefined, { version: 1 as const, books: {} }]) {
        const r = evaluateStaged(door, q, cfg.controls, st, vOptions);

        assert.equal(JSON.stringify(r), JSON.stringify(base));
        assert.equal(stagedCfgId(q, cfg.controls, st), cfgId(cfg));
        assert.equal(stagedEvalKey('D24', q, vOptions, cfg.controls, st), evalKeyOf('D24' as never, cfg, vOptions));
      }
      assert.equal(base.id, id);
      assert.equal(Math.round(base.net * 100) / 100, net);
      assert.equal(Math.round(base.dd * 100) / 100, dd);
    }
  });

  it('Growth: runGrowthBookStaged (absent or null stage) equals Priority 3’s runGrowthBook, for both comparators and stresses', async () => {
    const door = await openPrefixDoor('D24', 'test: staged OFF parity (Growth)', true);
    for (const cfg of [newL0, nOriginal]) {
      const g = quadOf(cfg).g.VGT;

      for (const friction of [
        undefined,
        { ...baseFriction, stopSlippageBps: 25 },
        { ...baseFriction, rate: 0.14, costBps: 10 }
      ]) {
        const want = runGrowthBook(door.sym.VGT, door, g, { friction, costBps: friction?.costBps });

        assert.deepEqual(runGrowthBookStaged(door.sym.VGT, door, g, { friction, costBps: friction?.costBps }), want);
        assert.deepEqual(
          runGrowthBookStaged(door.sym.VGT, door, g, { friction, costBps: friction?.costBps, staged: null }),
          want
        );
      }
    }
  });

  it('ON: the staged identity, counters, RC summaries, a consistent detailed replay, determinism, key separation', async () => {
    const door = await openPrefixDoor('D24', 'test: staged ON', true);

    for (const cfg of [newL0, nOriginal]) {
      const q = quadOf(cfg);
      const off = evaluate(door, q, cfg.controls, vOptions);
      const a = evaluateStaged(door, q, cfg.controls, ON, vOptions);
      const b = evaluateStaged(door, q, cfg.controls, ON, vOptions, { cache: false });
      const d = evaluateStagedDetail(door, q, cfg.controls, ON, vOptions);

      assert.match(a.id, /^st1-[0-9a-f]{16}$/);
      assert.equal(a.id, stagedCfgId(q, cfg.controls, ON));
      assert.deepEqual(Object.keys(a.staged!), ['D1:GDX', 'D1:VGT', 'G:VGT']);
      for (const x of Object.values(a.staged!))
        assert.ok(x.arms >= x.stagedExits && x.stagedExits >= x.placementExits && x.placementExits >= 0);
      assert.deepEqual(Object.keys(a.rc), Object.keys(off.rc));
      assert.equal(JSON.stringify(a), JSON.stringify(b));
      assert.equal(d.net, a.net);
      assert.equal(d.signature, a.signature);
      assert.ok(d.risk.lots === a.lots);
      assert.notEqual(stagedEvalKey('D24', q, vOptions, cfg.controls, ON), evalKeyOf('D24' as never, cfg, vOptions));
      assert.ok(a.signature !== off.signature, 'the stage changed the funded ledger');
    }
  });
});
