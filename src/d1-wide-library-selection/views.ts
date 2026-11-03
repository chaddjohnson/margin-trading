// Read-only views (`npm run d1-library-study -- <view>`): they read sealed records only, print a table and write the
// same under evaluations/d1-wide-library-selection/ (git-ignored). No view runs a strategy on a window its stage has
// not sealed; no view writes inside the study folder.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type FoldKey,
  type PoolKey,
  evaluationsRoot,
  foldKeys,
  folds,
  formatDollars,
  libraryKs,
  matrixFile,
  primaryK,
  readJson,
  resultFile,
  source,
  triples
} from './context.ts';
import { censusFile } from './census.ts';
import { isSealedFile, nestedSelectionFile, selectionFile } from './doors.ts';
import { evaluationFile, phaseKeys, readEngineRows, readFastRows, phaseOf } from './evaluation.ts';
import { analysisFile } from './analysis.ts';
import { chronologyChecks } from './chronology.ts';
import {
  codeFreezeFile,
  digestInForce,
  preFreezeRecords,
  readAmendments,
  verifyCodeFreeze,
  verifyProtocolFreeze
} from './freeze.ts';
import { readSealed, sha256File } from './records.ts';
import { searchFile } from './search.ts';
import { readMembers, readSelection } from './selection.ts';
import { reconstructionFile } from './archive.ts';

const output = async (name: string, lines: string[]) => {
  const file = path.join(evaluationsRoot, `${name}.txt`);

  await fs.outputFile(file, `${lines.join('\n')}\n`);
  console.info(lines.join('\n'));
  console.info(`\n(written to ${file})`);
};

const money = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? formatDollars(value) : '—');
const pct = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';

export const statusView = async () => {
  const lines = ['stage | record | state', '---|---|---'];
  const add = async (stage: string, file: string) =>
    lines.push(
      `${stage} | ${file} | ${(await fs.pathExists(file)) ? ((await isSealedFile(file)) ? 'sealed, verifies' : 'present, DOES NOT VERIFY') : 'not yet'}`
    );

  await add('protocol freeze', resultFile('..', 'PROTOCOL_FREEZE.json'));
  await add('anchors', resultFile('parity', 'ANCHORS.json'));

  for (const window of ['fold-a', 'fold-b', 'final'] as const) {
    await add(`archive reconstruction ${window}`, reconstructionFile(window));
    await add(`archive census ${window}`, censusFile(window));
  }

  for (const fold of foldKeys) {
    await add(`new search ${fold}`, searchFile(fold));
  }

  for (const fold of foldKeys) {
    await add(`engine-vs-fast parity sample ${fold}`, resultFile('parity', `SAMPLE_PARITY_${fold}.json`));
    await add(`libraries ${fold}`, selectionFile(fold));
  }

  await add('code freeze', codeFreezeFile);

  for (const phase of phaseKeys) {
    await add(`evaluation ${phase}`, evaluationFile(phase));

    if (phase === 'A') {
      await add('nested selection T1', nestedSelectionFile('T1'));
    }

    if (phase === 'B-sel') {
      await add('nested selection T2', nestedSelectionFile('T2'));
    }
  }

  await add('analysis', analysisFile);
  await output('status', lines);
};

export const methodsView = async () => {
  const matrix = await readJson<{
    arms: Record<string, string>;
    pools: Record<string, string>;
    libraryKs: number[];
    primaryK: number;
    decisionRules: Record<string, unknown>;
  }>(matrixFile);
  const lines = [
    'arm | rule',
    '---|---',
    ...Object.entries(matrix.arms).map(([arm, rule]) => `${arm} | ${rule}`),
    '',
    'pool | contents',
    '---|---',
    ...Object.entries(matrix.pools).map(([pool, text]) => `${pool} | ${text}`),
    '',
    `K ∈ {${matrix.libraryKs.join(', ')}}, primary K = ${matrix.primaryK}`,
    '',
    'decision rules:',
    ...Object.entries(matrix.decisionRules).map(
      ([key, rule]) => `- ${key}: ${Array.isArray(rule) ? rule.join(' | ') : String(rule)}`
    )
  ];

  await output('methods', lines);
};

export const foldsView = async () => {
  const lines = ['fold | role | training through | evaluation window | pools | libraries', '---|---|---|---|---|---'];

  for (const fold of foldKeys) {
    const spec = folds[fold];

    lines.push(
      `${fold} | ${spec.primary ? 'primary' : 'supplementary'} | ${spec.cutoff} | (${spec.cutoff}, ${spec.evaluationEnd}] | ${spec.pools.join(' ')} | ${(await isSealedFile(selectionFile(fold))) ? 'sealed' : 'not yet'}`
    );
  }

  lines.push('S21 | supplementary (derived) | 2021-12-31 (fold B NEW) | (2021-12-31, 2022-12-30] | NEW | fold B');
  lines.push(
    '',
    'triple | training | selection window | later window | pools | nested selection',
    '---|---|---|---|---|---'
  );

  for (const triple of Object.values(triples)) {
    lines.push(
      `${triple.key} | fold ${triple.fold} | (${folds[triple.fold].cutoff}, ${triple.selectionEnd}] | (${triple.selectionEnd}, ${triple.laterEnd}] | ${triple.pools.join(' ')} | ${(await isSealedFile(nestedSelectionFile(triple.key))) ? 'sealed' : 'not yet'}`
    );
  }

  await output('folds', lines);
};

export const inventoryView = async () => {
  const lines = [
    'window | rows | credible | median families | ETFs ≥ 8/16/32/64 families | A0 reproduced (rep/lib) | T-a share | T-b share',
    '---|---|---|---|---|---|---|---'
  ];

  for (const window of ['fold-a', 'fold-b', 'final'] as const) {
    if (!(await isSealedFile(censusFile(window)))) {
      lines.push(`${window} | (census not yet sealed)`);
      continue;
    }

    const census = await readSealed<{
      bodyHash: string;
      summary: {
        medianFamilies: number;
        etfsWithAtLeast: Record<string, number>;
        reproduced: Record<string, number>;
        triggerFewFamiliesShare: number;
        triggerDominanceShare: number;
      };
      rows: { credible: number; evaluated: number }[];
    }>(censusFile(window));
    const s = census.summary;

    lines.push(
      `${window} | ${census.rows.reduce((t, r) => t + r.evaluated, 0)} | ${census.rows.reduce((t, r) => t + r.credible, 0)} | ${s.medianFamilies} | ${[8, 16, 32, 64].map((k) => s.etfsWithAtLeast[String(k)]).join('/')} | ${s.reproduced.representative}/${s.reproduced.library} of 61 | ${pct(s.triggerFewFamiliesShare)} | ${pct(s.triggerDominanceShare)}`
    );
  }

  lines.push('', 'new search | evaluations | credible | collisions dropped', '---|---|---|---');

  for (const fold of foldKeys) {
    if (!(await isSealedFile(searchFile(fold)))) {
      lines.push(`${fold} | (not yet)`);
      continue;
    }

    const search = await readSealed<{
      bodyHash: string;
      evaluations: number;
      perSymbol: Record<string, { credible: number; collisionsDropped: number }>;
    }>(searchFile(fold));

    lines.push(
      `${fold} | ${search.evaluations} | ${Object.values(search.perSymbol).reduce((t, r) => t + r.credible, 0)} | ${Object.values(search.perSymbol).reduce((t, r) => t + r.collisionsDropped, 0)}`
    );
  }

  await output('inventory', lines);
};

export const discardedView = async (symbol: string, fold: FoldKey) => {
  const window = folds[fold].sourceWindow;

  if (!window) {
    throw new Error(`fold ${fold} has no archive`);
  }

  const census = await readSealed<{ bodyHash: string; rows: Record<string, unknown>[] }>(censusFile(window));
  const row = census.rows.find((r) => r.symbol === symbol);

  if (!row) {
    throw new Error(`${symbol} is not in the ${window} census`);
  }

  await output(`discarded-${symbol}-${fold}`, [`${symbol} ${window} (training only)`, JSON.stringify(row, null, 1)]);
};

export const showView = async (symbol: string, fold: FoldKey, method: string, k: number, pool: PoolKey) => {
  const selection = await readSelection(fold);
  const s = selection.selections[pool]?.[symbol];

  if (!s) {
    throw new Error(`${symbol} has no selection in fold ${fold} pool ${pool}`);
  }

  const members = (await readMembers(fold, pool))[symbol]!;
  const library =
    method === 'A0r'
      ? s.a0r.library
      : method === 'A0'
        ? (s.a0?.library ?? [])
        : method === 'A4'
          ? s.arms.A2.library.slice(0, k)
          : s.arms[method as 'A1' | 'A2' | 'A3'].library.slice(0, k);
  const nominee =
    method === 'A0r'
      ? s.a0r.nominee?.key
      : method === 'A0'
        ? s.a0?.nominee
        : method === 'A4'
          ? undefined
          : s.arms[method as 'A1' | 'A2' | 'A3'].nominees[String(k)]?.key;
  const phase = fold === 'A' ? 'A' : fold === 'B' ? 'B' : fold;
  const evaluated = (await isSealedFile(evaluationFile(phase as never)))
    ? await readFastRows(phase as never)
    : undefined;
  const lines = [
    `${symbol} fold ${fold} pool ${pool} ${method}${method === 'A0' || method === 'A0r' ? '' : `(K = ${k})`}: library of ${library.length}; nominee ${nominee ?? 'none'}`,
    '',
    'rank | grid | stage | family (size, support) | trades | net | best | worst | DD | J_s | T | J_nb | T_nb | A3 P25 | window V (5 bps)',
    '---|---|---|---|---|---|---|---|---|---|---|---|---|---|---'
  ];

  library.forEach((key, rank) => {
    const m = members[key]!;
    const v = evaluated?.get(`${symbol}|${key}`)?.['5']?.windows[0]?.v;

    lines.push(
      `${rank + 1}${key === nominee ? ' ★' : ''} | ${key} | ${m.stage} | ${m.family} (${m.familySize}, ${m.familySupport}) | ${m.trades} | ${money(m.net)} | ${money(m.best)} | ${money(m.worst)} | ${money(m.dd)} | ${money(m.js)} | ${money(m.t)} | ${money(m.jnb)} | ${money(m.tnb)} | ${money(m.a3?.p25)} | ${evaluated ? money(v) : '(window not evaluated)'}`
    );
  });

  if (nominee && evaluated) {
    const engine = (await readEngineRows(phase as never)).find(
      (row) => row.symbol === symbol && row.key === nominee
    ) as { lots: Record<string, unknown>[] } | undefined;

    if (engine) {
      lines.push(
        '',
        `funded-trade ledger of the nominee (5 bps, full engine, 2016-01-04 → ${phaseOf(phase as never).end}):`,
        'entry ET | exit ET | entry | exit | reason | gross | interest | friction | net | cumulative | MAE | MFE | held days',
        '---|---|---|---|---|---|---|---|---|---|---|---|---'
      );

      let cumulative = 0;

      for (const lot of engine.lots) {
        cumulative += lot.net as number;
        lines.push(
          `${new Date((lot.entryTime as number) * 1000).toLocaleString('en-US', { timeZone: 'America/New_York' })} | ${lot.exitIndex === -1 ? 'open' : new Date((lot.exitTime as number) * 1000).toLocaleString('en-US', { timeZone: 'America/New_York' })} | ${(lot.entryRawPrice as number).toFixed(2)} | ${(lot.exitRawPrice as number).toFixed(2)} | ${lot.exitReason} | ${money(lot.gross)} | ${money(lot.interest)} | ${money(lot.friction)} | ${money(lot.net)} | ${money(cumulative)} | ${pct(lot.maePercent)} | ${pct(lot.mfePercent)} | ${(lot.heldDays as number).toFixed(0)}`
        );
      }
    }
  }

  await output(`show-${symbol}-${fold}-${pool}-${method}-${k}`, lines);
};

export const compareView = async (cellKey: string, pool?: string, k?: number) => {
  if (!(await isSealedFile(analysisFile))) {
    throw new Error('the analysis is not sealed yet');
  }

  const analysis = await readSealed<{
    bodyHash: string;
    metrics: Record<string, unknown>[];
    comparisons: Record<string, Record<string, Record<string, Record<string, Record<string, unknown>>>>>;
  }>(analysisFile);
  const rows = analysis.metrics.filter(
    (m) => m.cell === cellKey && (!pool || m.pool === pool) && (!k || m.k === String(k) || m.k === '-')
  );
  const lines = [
    `window ${cellKey}${pool ? ` pool ${pool}` : ''}${k ? ` K = ${k}` : ''}: Σ V over 61 ETFs (no nominee = 0), vs A0r on the same pool`,
    '',
    'pool | arm | K | nominees | Σ V 5 bps | Σ V 10 bps | median V | breaches | Δ mean 5 | W/L/I | clusters W/L | favourable',
    '---|---|---|---|---|---|---|---|---|---|---|---'
  ];

  for (const m of rows) {
    const v = m.v as Record<string, { sum: number; median: number }>;
    const cmp = analysis.comparisons[cellKey]?.[m.pool as string]?.[m.arm as string]?.[
      m.k === '-' ? String(primaryK) : (m.k as string)
    ] as Record<string, number | boolean> | undefined;

    lines.push(
      `${m.pool} | ${m.arm} | ${m.k} | ${m.nominees} | ${money(v['5']!.sum)} | ${money(v['10']!.sum)} | ${money(v['5']!.median)} | ${m.breaches} | ${cmp ? money(cmp.meanD5) : 'baseline'} | ${cmp ? `${cmp.wins}/${cmp.losses}/${cmp.identical}` : ''} | ${cmp ? `${cmp.clusterWins}/${cmp.clusterLosses}` : ''} | ${cmp ? (cmp.evaluable ? String(cmp.favourable) : 'insufficient') : ''}`
    );
  }

  await output(`compare-${cellKey}${pool ? `-${pool}` : ''}${k ? `-${k}` : ''}`, lines);
};

export const nestedView = async () => {
  const analysis = await readSealed<{
    bodyHash: string;
    nestedVerdict: string;
    nestedCells: Record<string, Record<string, string>>;
    nestedAcross: Record<string, Record<string, string>>;
    metrics: Record<string, unknown>[];
  }>(analysisFile);
  const lines = [
    `nested verdict (T1/NEW primary; T2 secondary): ${analysis.nestedVerdict}`,
    '',
    'later window | pool | cell state | across-ETF',
    '---|---|---|---',
    ...Object.entries(analysis.nestedCells).flatMap(([cell, byPool]) =>
      Object.entries(byPool).map(
        ([pool, verdict]) => `${cell} | ${pool} | ${verdict} | ${analysis.nestedAcross[cell]?.[pool] ?? ''}`
      )
    ),
    '',
    'cell | pool | K | A4 picks | mean selection V | mean later V | later V > 0 | thin evidence',
    '---|---|---|---|---|---|---|---'
  ];

  for (const m of analysis.metrics.filter((row) => row.arm === 'A4')) {
    const n = m.nested as Record<string, number>;

    lines.push(
      `${m.cell} | ${m.pool} | ${m.k} | ${n.picks} | ${money(n.meanSelectionV)} | ${money(n.meanLaterV)} | ${n.laterPositive} | ${n.thinEvidence}`
    );
  }

  await output('nested', lines);
};

// verify: every freeze and sealed record, the files they reference, the baseline manifests, the unchanged inputs of
// earlier studies, and the study's own invariants (budgets, collisions, parity flags).
export const verifyView = async () => {
  const problems: string[] = [];
  const lines: string[] = [];
  const check = (name: string, ok: boolean, detail = '') => {
    lines.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);

    if (!ok) {
      problems.push(name);
    }
  };
  const protocol = await verifyProtocolFreeze().catch((error: Error) => ({ bodyHash: '', problems: [error.message] }));
  const protocolRecord = (await isSealedFile(resultFile('..', 'PROTOCOL_FREEZE.json')))
    ? await readSealed<{ bodyHash: string; frozenAt: string }>(resultFile('..', 'PROTOCOL_FREEZE.json'))
    : undefined;
  const protocolBody = protocolRecord?.bodyHash;
  const frozenAt = protocolRecord?.frozenAt;
  const codeRecord = (await isSealedFile(codeFreezeFile))
    ? await readSealed<{ bodyHash: string; frozenAt: string; outcomeDigest: string }>(codeFreezeFile)
    : undefined;
  const codeBody = codeRecord?.bodyHash;
  const codeFrozenAt = codeRecord?.frozenAt;

  for (const chronology of await chronologyChecks()) {
    check(`chronology: ${chronology.name}`, chronology.pass, chronology.detail);
  }

  check('protocol freeze', protocol.problems.length === 0, protocol.problems.join('; '));

  if (await fs.pathExists(codeFreezeFile)) {
    const code = await verifyCodeFreeze();

    check('code freeze', code.problems.length === 0, code.problems.join('; '));
  }

  for (const [label, file] of [
    ['data baseline', 'results/baseline/data.sha256'],
    ['key inputs', 'results/baseline/key-inputs.sha256']
  ] as const) {
    const manifest = path.join(resultFile('..'), file);
    const entries = (await fs.readFile(manifest, 'utf8')).split('\n').filter(Boolean);
    let bad = 0;

    for (const entry of entries) {
      const [hash, name] = entry.split(/\s+/);

      if (name === 'package.json') {
        continue; // changed by design (one script); checked exactly below
      }

      if (!(await fs.pathExists(name!)) || (await sha256File(name!)) !== hash) {
        bad++;
      }
    }

    check(`${label} unchanged (${entries.length} files)`, bad === 0, bad ? `${bad} differ` : '');
  }

  // package.json: identical to the baseline HEAD's except one added script, `d1-library-study`
  {
    const { execFileSync } = await import('node:child_process');
    const baseHead = (await fs.readFile(path.join(resultFile('..'), 'results/baseline/head.txt'), 'utf8')).trim();
    const before = JSON.parse(execFileSync('git', ['show', `${baseHead}:package.json`], { encoding: 'utf8' }));
    const now = JSON.parse(await fs.readFile('package.json', 'utf8'));
    const { 'd1-library-study': added, ...scripts } = now.scripts ?? {};
    const same = JSON.stringify({ ...now, scripts }) === JSON.stringify(before);

    check(
      'package.json differs from the baseline only by the one `d1-library-study` script',
      same && typeof added === 'string'
    );

    // reporting amendment 2: every tracked path outside the study's two folders and package.json is as at the
    // baseline HEAD (the working tree against that commit, so committing the study keeps this check valid)
    const changed = execFileSync('git', ['diff', '--name-only', baseHead], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .filter(
        (name) =>
          name !== 'package.json' &&
          !name.startsWith('research/d1-wide-library-chronological-selection/') &&
          !name.startsWith('src/d1-wide-library-selection/')
      );

    check(
      'no tracked path outside this study, its code and package.json differs from the baseline HEAD',
      changed.length === 0,
      changed.slice(0, 5).join(', ')
    );
  }

  // reporting amendment 2: the analysis read the current sealed evaluations and started after the last of them
  if (await isSealedFile(analysisFile)) {
    const analysis = await readSealed<{ bodyHash: string; startedAt: string; inputs: Record<string, string> }>(
      analysisFile
    );
    const problems: string[] = [];

    for (const phase of phaseKeys) {
      const evaluation = await readSealed<{ bodyHash: string; finishedAt: string }>(evaluationFile(phase));

      if (analysis.inputs[phase] !== evaluation.bodyHash) {
        problems.push(`${phase} input differs`);
      }

      if (!(evaluation.finishedAt < analysis.startedAt)) {
        problems.push(`${phase} finished after the analysis started`);
      }
    }

    check(
      'analysis inputs are the current evaluations, all finished before the analysis started',
      problems.length === 0,
      problems.join('; ')
    );
  }

  const records = [
    resultFile('parity', 'ANCHORS.json'),
    resultFile('archive', 'fold-a', 'CENSUS-prefreeze-v1.json'),
    ...(['fold-a', 'fold-b', 'final'] as const).flatMap((w) => [reconstructionFile(w), censusFile(w)]),
    ...foldKeys.map((fold) => searchFile(fold)),
    ...foldKeys.map((fold) => resultFile('parity', `SAMPLE_PARITY_${fold}.json`)),
    ...foldKeys.map((fold) => selectionFile(fold)),
    nestedSelectionFile('T1'),
    nestedSelectionFile('T2'),
    ...phaseKeys.map((phase) => evaluationFile(phase)),
    analysisFile
  ];

  for (const file of records) {
    if (!(await fs.pathExists(file))) {
      lines.push(`---- ${file} (not yet written)`);
      continue;
    }

    const ok = await isSealedFile(file);

    check(`sealed ${file}`, ok);

    if (ok) {
      const record = await readSealed<Record<string, unknown> & { bodyHash: string }>(file);
      const stamp = record.guard as { protocolBody?: string; codeBody?: string; outcomeDigest?: string } | undefined;
      const started = record.startedAt as string | undefined;

      // every record outside the pre-freeze list: both freeze stamps, a start after the code freeze, and the
      // outcome-code digest in force when it started; a record whose digest a later amendment replaced must be named
      // by that amendment as superseded, or the amendment must state why no sealed record is affected
      if (!preFreezeRecords().includes(file)) {
        check(`  ${file} stamp: protocol body`, Boolean(protocolBody) && stamp?.protocolBody === protocolBody);
        check(`  ${file} stamp: code body`, Boolean(codeBody) && stamp?.codeBody === codeBody);
        check(`  ${file} started after the code freeze`, Boolean(codeFrozenAt && started && started > codeFrozenAt));

        if (started && codeBody) {
          const inForce = await digestInForce(started);

          check(
            `  ${file} stamp: the outcome-code digest in force at its start`,
            stamp?.outcomeDigest === inForce.digest
          );

          for (const amendment of (await readAmendments()).filter((a) => a.outcomeDigest && a.createdAt > started)) {
            const named = (amendment.supersedes ?? []).includes(file);

            check(
              `  ${file} accounted for by amendment ${amendment.index}`,
              named || Boolean(amendment.unaffected),
              named ? 'superseded' : (amendment.unaffected ?? 'not accounted for')
            );
          }
        }
      }

      const refs: { file: string; sha256: string }[] = [];
      const walk = (value: unknown) => {
        if (value && typeof value === 'object') {
          const entry = value as { file?: unknown; sha256?: unknown };

          if (typeof entry.file === 'string' && typeof entry.sha256 === 'string') {
            refs.push({ file: entry.file, sha256: entry.sha256 });
          }

          Object.values(value).forEach(walk);
        }
      };

      walk(record);

      for (const ref of refs) {
        const present = await fs.pathExists(ref.file);

        check(
          `  referenced ${ref.file}`,
          present && (await sha256File(ref.file)) === ref.sha256,
          present ? '' : 'missing (regenerable; see README)'
        );
      }
    }
  }

  for (const fold of foldKeys) {
    if (await isSealedFile(searchFile(fold))) {
      const search = await readSealed<{
        bodyHash: string;
        perSymbol: Record<string, { sobol: number; refine: number; collisionsDropped: number }>;
      }>(searchFile(fold));
      const over = Object.entries(search.perSymbol).filter(
        ([, r]) => r.sobol + r.collisionsDropped > 1024 || r.refine > 128
      );

      check(
        `new search ${fold} within budget (≤ 1,024 Sobol, ≤ 128 refinements per ETF)`,
        over.length === 0,
        over.map(([s]) => s).join(' ')
      );
    }
  }

  const sourceStage = await Promise.all(
    (['fold-a', 'fold-b', 'final'] as const).map((w) => isSealedFile(source.stageA(w)))
  );

  check('source Stage A records verify', sourceStage.every(Boolean));

  void libraryKs;
  await output('verify', [
    ...lines,
    '',
    problems.length === 0 ? 'all checks passed' : `${problems.length} check(s) FAILED`
  ]);

  if (problems.length > 0) {
    throw new Error('verification failed');
  }
};
