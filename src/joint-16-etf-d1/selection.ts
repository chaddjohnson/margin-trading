// The one-time selection manifest (PROTOCOL.md §10.1), written after the training stages and before any holdout,
// final or `all` figure of a nominee: the nominees (members, eight-parameter vectors, book and tie order), the
// benchmarks, the frozen ranking, the gate results, the acceptance rules, hashes of code, data and market events,
// seeds, budgets, evaluation counts, parity signatures and the authorized commands. Refused if it already exists.
import fs from 'fs-extra';
import { bookOrderOf, tieOrderOf } from '../portfolio-aware-d1/nbook/engine.ts';
import { dataHashes, hashesOf, inputFiles, studyCodeFiles } from './audit.ts';
import { benchmarkLabels, benchmarkSymbols, gdxGrid, gdxPhenotypeName } from './benchmarks.ts';
import { frozenSelectionFile, log, nowIso, protocolFreezeFile, readJson, stageDir, study } from './context.ts';
import { gitState, requireProtocolFrozen, sha256File, writeSelectionManifest } from './freeze.ts';
import type { Battery, Gated } from './robust.ts';

const recordFiles = [
  'audit/audit.json',
  'controls/controls.json',
  'parity/parity.json',
  'library/library.json',
  'library/library.jsonl',
  'discovery/discovery.json',
  'discovery/evaluations.jsonl',
  'refine/refine.json',
  'refine/evaluations.jsonl',
  'robust/robust.json',
  'determinism/determinism.json'
];

interface RobustRecord {
  gated: Gated[];
  passing: string[];
  nominees: { role: string; rule: string; key: string; label: string; score: number }[];
  confirmations: unknown[];
  ladder: unknown[];
  totals: Record<string, unknown>;
  coverage: unknown;
  rollingOrigin: unknown;
}

const trainingFiguresOf = (battery: Battery) => ({
  fixed: Object.fromEntries(
    Object.entries(battery.costs).map(([cost, e]) => [
      cost,
      { net: e.net, minuteDrawdown: e.minuteDrawdown, dailyDrawdown: e.dailyDrawdown, lots: e.lots }
    ])
  ),
  portfolio5: {
    endEquity: battery.full.portfolio.endEquity,
    dailyPercent: battery.full.portfolio.dailyPercent,
    minutePercent: battery.full.portfolio.minutePercent,
    borrowingDollarDays: battery.full.portfolio.borrowingDollarDays
  },
  jointP50: battery.joint.p50,
  probesMedian: battery.probes.median
});

export const freezeSelection = async () => {
  await requireProtocolFrozen();

  if (await fs.pathExists(frozenSelectionFile)) {
    throw new Error(`${frozenSelectionFile} exists: the selection is frozen once and never rewritten`);
  }

  for (const file of [
    'audit/audit.json',
    'controls/controls.json',
    'parity/parity.json',
    'determinism/determinism.json'
  ]) {
    const record = await readJson<{ passed?: boolean; identical?: boolean }>(stageDir(file));

    if (record.passed === false || record.identical === false) {
      throw new Error(`${file} did not pass: nothing may be frozen`);
    }
  }

  const robust = await readJson<RobustRecord>(stageDir('robust', 'robust.json'));
  const audit = await readJson<{ calendar: { lastCommon: string } }>(stageDir('audit', 'audit.json'));
  const byKey = new Map(robust.gated.map((item) => [item.battery.key, item]));
  const nominees = robust.nominees.map((nominee) => {
    const item = byKey.get(nominee.key)!;
    const symbols = item.battery.books.map((book) => book.symbol);

    return {
      key: `N-${nominee.role === 'primary' ? 'primary' : nominee.role === 'alternative 1' ? 'alt1' : 'alt2'}`,
      role: nominee.role,
      rule: nominee.rule,
      configurationKey: nominee.key,
      label: nominee.label,
      score: nominee.score,
      books: item.battery.books,
      bookOrder: bookOrderOf(symbols),
      tieOrder: tieOrderOf(symbols),
      gates: item.outcome.gates,
      conditional: item.outcome.conditional,
      training: trainingFiguresOf(item.battery)
    };
  });
  const ranking = robust.passing.map((key) => ({ key, score: byKey.get(key)!.outcome.score }));
  const records: Record<string, string> = {};

  for (const file of recordFiles) {
    if (await fs.pathExists(stageDir(file))) {
      records[file] = await sha256File(stageDir(file));
    }
  }

  const body = {
    version: study.version,
    frozenAt: nowIso(),
    git: gitState(),
    protocol: {
      file: 'research/joint-16-etf-d1/PROTOCOL.md',
      sha256: await sha256File('research/joint-16-etf-d1/PROTOCOL.md'),
      freeze: await readJson(protocolFreezeFile)
    },
    lastCommonSession: audit.calendar.lastCommon,
    outcome: nominees.length > 0 ? 'nominated' : 'no advancement',
    nominees,
    benchmarks: {
      B1: { label: benchmarkLabels.B1, symbols: benchmarkSymbols.B1, phenotypes: { VGT: 'primary' } },
      B4: {
        label: benchmarkLabels.B4,
        symbols: benchmarkSymbols.B4,
        phenotypes: { VGT: 'primary', XBI: 'lowDd', XRT: 'lowDd', KRE: 'lowDd' }
      },
      B5: {
        label: benchmarkLabels.B5,
        symbols: benchmarkSymbols.B5,
        phenotypes: { VGT: 'primary', XBI: 'lowDd', XRT: 'lowDd', KRE: 'lowDd', GDX: gdxPhenotypeName },
        gdxGrid: await gdxGrid()
      },
      C0: { label: benchmarkLabels.C0, symbols: [] }
    },
    ranking,
    gatesDefinition: study.gates,
    score: { complexityPenalty: study.complexityPenalty, regimeBonus: study.score.regimeBonus },
    acceptance: {
      ...study.acceptance,
      rules: [
        'A1 post-training fixed Δ@5 vs B5 (holdout + final) ≥ +$15,000 (≥ +$25,000 if the full-all portfolio daily % DD is in (30%, 35%])',
        'A2 post-training fixed Δ vs B5 > 0 at 0, 2 and 10 bps',
        'A3 neither the holdout Δ@5 nor the final Δ@5 vs B5 ≤ −$2,500',
        'A4 full-all fixed minute drawdown@5 ≤ $35,000',
        'A5 full-all portfolio maximum daily % drawdown@5 ≤ 35%',
        "A6 portfolio post-training compounded return@5 ≥ B5's"
      ],
      recommendation:
        'the accepted nominee ranked highest by the frozen training score; otherwise the benchmarks are retained as previously recommended (B5 optional forward-test candidate, B4 defensible)'
    },
    seeds: {
      library: [study.seedLabel, 'library', 'sobol-scramble'],
      greedy: [study.seedLabel, 'greedy', '<ETF>'],
      islands: [study.seedLabel, 'island', '<I1…I8>'],
      migration: [study.seedLabel, 'migration', '<generation>'],
      refine: [study.seedLabel, 'refine', '<slot>'],
      jointPerturbation: [study.seedLabel, 'joint-perturbation', '<key>'],
      ties: [study.seedLabel, 'ties', '<key>', '<n>'],
      parity: [study.seedLabel, 'parity', '<size>', '<n>']
    },
    budgets: {
      library: study.library,
      greedy: study.greedy,
      islands: { ...study.islands, kinds: study.islands.kinds.map((kind) => kind.key) },
      refinement: study.refinement,
      robustness: study.robustness,
      actual: robust.totals
    },
    records,
    inputs: await hashesOf(inputFiles),
    data: await dataHashes(),
    code: await hashesOf(await studyCodeFiles()),
    authorizedCommands: [
      'npm run joint-16-etf-d1 -- evaluate',
      'npm run joint-16-etf-d1 -- evaluate --confirm',
      'npm run joint-16-etf-d1 -- run --config <key> --mode fixed|portfolio --dataset <partition> (writes to evaluations/joint-16-etf-d1/)'
    ],
    statement:
      'Every nominee, gate and rank above was computed from the training partition only (2016-01-04 → 2023-12-29). No holdout, final or all figure of any nominee had been computed when this manifest was written.'
  };
  const manifest = await writeSelectionManifest(body);

  log(`selection frozen: ${nominees.length} nominee(s), manifest ${manifest.manifestHash}`);
};
