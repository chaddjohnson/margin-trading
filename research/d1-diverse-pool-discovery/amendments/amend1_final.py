# Amendment 1 (pre-selection-freeze review minor findings 1-4; final.ts only). Apply AFTER the final search seals.
p='src/d1-diverse/final.ts'  # run from the repository root
s=open(p).read()
def rep(old,new):
    global s
    assert old in s, old[:90]
    s=s.replace(old,new,1)

# imports
rep("""  readJson,
  stageDir,
  study,
  writeJson
} from './context.ts';""","""  readJson,
  seedLabels,
  stageDir,
  study,
  writeJson
} from './context.ts';""")
rep("""import { scoreSetOf, temporalNet } from './scores.ts';""","""import { scoreOfDraws, scoreSetOf, temporalNet } from './scores.ts';""")

# freeze-selection: calibration, rankings, score recomputation from draws
rep("""  const recomputed: Record<string, unknown> = {};

  for (const candidate of ['J', 'T'] as const) {
    const rows: Ranked[] = [];
""","""  const recomputed: Record<string, unknown> = {};
  const rankings: Record<string, unknown> = {};
  const finalCalibration = await readCalibration('final');
  let maxScoreDeviation = 0;

  for (const candidate of ['J', 'T'] as const) {
    const rows: Ranked[] = [];
""")
rep("""          throw new Error(`${finalist.label}: the recomputed gates or score differ from the stored assessment`);
        }
""","""          throw new Error(`${finalist.label}: the recomputed gates or score differ from the stored assessment`);
        }

        // The score itself recomputed from the stored confirm-A draws and the sealed calibration (not read back).
        const fromDraws = scoreOfDraws(
          {
            net: Float64Array.from(candidate === 'J' ? finalist.draws.net : finalist.draws.netT),
            drawdown: Float64Array.from(finalist.draws.drawdown)
          },
          finalist.members.length,
          finalCalibration.references
        );

        maxScoreDeviation = Math.max(maxScoreDeviation, Math.abs(fromDraws - value));

        if (Math.abs(fromDraws - value) > 1e-6) {
          throw new Error(`${finalist.label}: the score recomputed from its stored draws differs (${fromDraws} vs ${value})`);
        }
""")
rep("""    const picked = pick(rankRows(rows, candidate), 'final');""","""    const order = rankRows(rows, candidate);
    const picked = pick(order, 'final');

    rankings[candidate] = order.map((row) => ({
      label: row.assessment.label,
      arm: row.arm,
      members: row.assessment.members,
      value: row.value,
      pass: row.pass,
      gates: row.gates.map((gate) => ({ gate: gate.gate, pass: gate.pass, detail: gate.detail })),
      labels: row.assessment.labels
    }));""")

# records: benchmarks.json and refine files
rep("""      for (const name of ['promotion.json', 'assessment.json']) {
        records[`${window}/${arm}/${name}`] = await hashOfFile(selectDir(window, arm, name));
      }
    }
  }""","""      for (const name of ['promotion.json', 'assessment.json']) {
        records[`${window}/${arm}/${name}`] = await hashOfFile(selectDir(window, arm, name));
      }

      const armDir = selectDir(window, arm);

      for (const name of (await fs.pathExists(armDir)) ? (await fs.readdir(armDir)).filter((item) => item.startsWith('refine-')).sort() : []) {
        records[`${window}/${arm}/${name}`] = await hashOfFile(selectDir(window, arm, name));
      }
    }

    records[`${window}/benchmarks.json`] = await hashOfFile(selectDir(window, 'benchmarks.json'));
  }""")

# serialized data hashing
rep("""  const dataHashes = Object.fromEntries(
    await Promise.all(
      universe.map(async (symbol) => [`data/${symbol}/data.csv`, await sha256File(`data/${symbol}/data.csv`)] as const)
    )
  );""","""  // one file at a time (whole-file reads; concurrency would hold several GB transiently)
  const dataHashes: Record<string, string> = {};

  for (const symbol of universe) {
    dataHashes[`data/${symbol}/data.csv`] = await sha256File(`data/${symbol}/data.csv`);
  }

  const { tier } = await readTier();
  const parity = await readJson<{ counts: unknown }>(stageDir('parity', 'parity.json'));""")

# manifest fields
rep("""    nominees,
    recomputedNominations: recomputed,""","""    nominees,
    nomineeTieOrder: 'alphabetical (the engine default; identity order checked equal in G1)',
    hypotheticalNominations: {
      note: procedure
        ? `only procedure ${procedure}'s list is a nomination; the other procedure's list is hypothetical`
        : 'HYPOTHETICAL — GP failed for both procedures; these lists are NOT nominations and nothing is evaluated after 2023',
      ...recomputed
    },
    rankings,
    scoreRecomputation: { from: 'stored confirm-A draws and the sealed final calibration', maxDeviation: maxScoreDeviation },
    seeds: seedLabels,
    budgets: { tier: tier.key, tierRecord: tier },
    evaluations: Object.fromEntries(
      Object.entries(manifests).map(([window, manifest]) => [
        window,
        Object.fromEntries(Object.entries(manifest.arms as Record<string, { entries: number }>).map(([arm, item]) => [arm, item.entries]))
      ])
    ),
    paritySignature: parity.counts,""")

# confirm-b: verify inputs; benchmark confirm-A
rep("""  const references = await inspectedReferenceBooks();
  const configs: { label: string; kind: string; books: Book[]; assessmentA?: Assessment }[] = [];

  for (const arm of armsOf('final')) {""","""  const references = await inspectedReferenceBooks();
  const configs: { label: string; kind: string; books: Book[]; assessmentA?: Assessment }[] = [];
  const frozenRecords = manifest.records as Record<string, string>;

  // The inputs must be the records the selection freeze bound.
  for (const [record, file] of [
    ...armsOf('final').map((arm) => [`final/${arm}/assessment.json`, selectDir('final', arm, 'assessment.json')] as const),
    ['final/benchmarks.json', selectDir('final', 'benchmarks.json')] as const
  ]) {
    if ((await sha256File(file)) !== frozenRecords[record]) {
      throw new Error(`${file} does not hash to the frozen selection's record`);
    }
  }

  const benchmarkA = (await readJson<{ benchmarks: Record<'B1' | 'B4' | 'B5', Assessment> }>(selectDir('final', 'benchmarks.json'))).benchmarks;

  for (const arm of armsOf('final')) {""")
rep("""    configs.push({ label: key, kind: 'benchmark', books: benchmarks[key] });""","""    configs.push({ label: key, kind: 'benchmark', books: benchmarks[key], assessmentA: benchmarkA[key] });""")
open(p,'w').write(s)
print('patched')
