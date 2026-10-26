// The whole study pipeline end to end on synthetic minute data in a scratch tree (PROTOCOL.md §13.6): Stage A,
// rankings, diagnostic, Stage D, controls, picks, validation for both folds, the procedure gate, the final window, the
// selection, the research-pool export and the read-only CLI commands. Every path is redirected by
// RANKED_PREEMPTION_ROOT / RANKED_PREEMPTION_DATA before the study modules are imported; a tiny tier keeps it fast.
// It checks structure and the write-once guards, not figures.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, newYorkOffset, nyseHolidays } from '#lib';

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'ranked-preemption-pipeline-'));
const dataDir = path.join(scratch, 'data');

process.env.RANKED_PREEMPTION_ROOT = path.join(scratch, 'tree');
process.env.RANKED_PREEMPTION_DATA = dataDir;

const symbols = ['GDX', 'KRE', 'VGT', 'VOOG', 'XBI', 'XLE', 'XLK', 'XRT']; // candidate-universe names (the neighbourhood CRN patterns are defined for those)

// 2016-01-04 → 2022-12-30, four bars a day: a drift with periodic dips of 12–14% at symbol-specific phases.
const rows = (symbol: string) => {
  const lines: string[] = [];
  const phase = symbols.indexOf(symbol) * 4;
  let price = 100;
  let day = 0;

  for (let time = Date.parse('2016-01-04T00:00:00Z'); time <= Date.parse('2022-12-30T00:00:00Z'); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const weekday = new Date(time).getUTCDay();

    if (weekday === 0 || weekday === 6 || nyseHolidays.has(date)) {
      continue;
    }

    day++;

    // every 31 sessions (shifted per symbol) a 16–18% fall over two sessions, then a 12-session rebound of ~1.4%
    // a session, otherwise a small drift: deep-dip D1 vectors trade and mostly win
    const cycle = (day + phase) % 31;
    const depth = 0.08 + (symbols.indexOf(symbol) % 3) * 0.005;

    price =
      cycle === 0 || cycle === 1
        ? price * (1 - depth)
        : cycle >= 2 && cycle <= 13
          ? price * 1.014
          : price * (1 + ((day % 7) - 3) * 0.0008);

    const at = (hour: number, minute: number) => {
      const local =
        Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;

      return `"${new Date((local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000)) * 1000).toISOString().replace('.000', '')}"`;
    };

    for (const [hour, minute, move] of [
      [9, 30, 0],
      [10, 30, -0.012],
      [12, 0, -0.004],
      [14, 0, 0.011],
      [15, 59, 0.003]
    ] as const) {
      const p = price * (1 + move);

      lines.push(`${at(hour, minute)},${p},${p * 1.002},${p * 0.998},${p},1000`);
    }
  }

  return `${lines.join('\n')}\n`;
};

before(async () => {
  await fs.outputFile(path.join(dataDir, 'partitions.json'), defaultPartitionConfigText);

  for (const symbol of symbols) {
    await fs.outputFile(path.join(dataDir, symbol, 'data.csv'), rows(symbol));
  }
});

after(async () => {
  if (!process.env.RANKED_PREEMPTION_KEEP) {
    await fs.remove(scratch);
  } else {
    console.log(`kept ${scratch}`);
  }
});

describe('the study pipeline on synthetic data', () => {
  test('every stage runs once, in order, and refuses a rerun; the CLI reads the sealed records', async () => {
    const context = await import('../context.ts');
    const { loadNUniverse } = await import('../../portfolio-aware-d1/nbook/universe.ts');
    const { writeSealed, codeManifest } = await import('../freeze.ts');
    const { readSealed } = await import('../freeze.ts');
    const { runStageA } = await import('../standalone.ts');
    const { runRankings, readRanking, recheckRankings } = await import('../ranking.ts');
    const { runDiagnostic } = await import('../diagnostic.ts');
    const { runJoint, readJoint } = await import('../joint.ts');
    const { runControls } = await import('../controls.ts');
    const { runPicks, runValidation, runProcedureGate } = await import('../walkforward.ts');
    const { runSelection } = await import('../final.ts');
    const { exportPools, listResearchPools } = await import('../researchPools.ts');
    const { runCli } = await import('../cli.ts');

    assert.ok(context.researchRoot.startsWith(scratch), 'paths are redirected');

    // the audit record, the tier and the two freezes of the scratch tree
    const loaded = await loadNUniverse({
      members: symbols,
      partition: 'training',
      access: 'manual evaluation',
      warmupSessions: 0,
      root: dataDir
    });

    await context.writeJson(context.universeFile, {
      eligible: symbols,
      symbols: Object.fromEntries(
        symbols.map((symbol) => [
          symbol,
          { eligible: true, cohort: 'eligible', dataSha256: loaded.windows[symbol]!.dataSha256, reasons: [] }
        ])
      )
    });
    await context.writeJson(context.tierFile, {
      tier: {
        key: 'T3',
        label: 'test',
        sobol: 24,
        localRounds: 2,
        standaloneDraws: 4,
        jointBudget: { 'fold-a': 120, 'fold-b': 120, final: 160 },
        promotionDraws: 4,
        assessmentDraws: 6,
        assessmentA2Draws: 2
      }
    });
    await writeSealed(context.protocolFreezeFile, {
      kind: 'test',
      files: {},
      prospectiveBodyHash: (await readSealed(context.prospectiveFreezeFile)).bodyHash
    });
    await writeSealed(context.codeFreezeFile, { kind: 'test', code: await codeManifest() });

    let picked = 0;

    await assert.rejects(() => runStageA('fold-b', { workers: 0 }), /fold-b opens only after fold-a/);

    for (const window of ['fold-a', 'fold-b', 'final'] as const) {
      await runStageA(window, { workers: 0 });
      await assert.rejects(() => runStageA(window, { workers: 0 }), /sealed and never rerun/);
      await runRankings(window);
      await recheckRankings(window);

      const ranking = await readRanking(window, 'R1');

      assert.equal(ranking.order.length, symbols.length);
      await runDiagnostic(window);
      await runJoint(window, { workers: 0 });
      await runControls(window, { workers: 0 });

      if (window !== 'final') {
        await assert.rejects(() => runValidation(window, { workers: 0 }), /does not exist/);
        await runPicks(window);
        await runValidation(window, { workers: 0 });
        await assert.rejects(() => runValidation(window, { workers: 0 }), /never rerun/);
      } else {
        await runSelection();
      }

      if (window === 'fold-a') {
        await assert.rejects(() => runStageA('final', { workers: 0 }), /opens only after the sealed procedure gate/);
      }

      if (window === 'fold-b') {
        await runProcedureGate();
      }

      await exportPools(window);

      const joint = await readJoint(window, 'R1');

      assert.ok(Array.isArray(joint.arms));
      picked += joint.pick ? 1 : 0;
    }

    assert.ok(picked > 0, 'Stage D picked at least once');

    const pools = await listResearchPools();

    assert.ok(pools.length > 0, 'research pools exported');
    await runCli(['list']);
    await runCli(['compare']);
    await runCli(['show', pools[0]!.id]);
    await runCli(['fixed', pools[0]!.id]);
    await runCli(['portfolio', pools[0]!.id]);
    await runCli(['prospective']);
    await runCli(['verify']);
    await runCli(['tables']);
    await assert.rejects(() => runCli(['fixed', pools[0]!.id, '--end', '2024-06-28']), /research-only/);
  });
});
