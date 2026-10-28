// The command line (PROTOCOL.md §11). Read-only commands print from sealed records (they never recompute a sealed
// figure or write anything); `stage <name>` runs one write-once stage. Nothing here reads a bar after 2023-12-29.
import fs from 'fs-extra';
import { analysisFile, analysisFileOf, stageAnalysis } from './analysisStage.ts';
import {
  type BaselineKey,
  type DataEnd,
  type ViewKey,
  type WindowKey,
  codeFreezeFile,
  log,
  matrixViews,
  protocolFile,
  protocolFreezeFile,
  resultFile
} from './context.ts';
import {
  auditFile,
  codeFreezeFileOf,
  freezeCodeCorrection,
  parityFile,
  requireCodeFrozen,
  requireProtected
} from './freeze.ts';
import type { SymbolSummary } from './leveld.ts';
import { leveldFile, stageLevelD } from './leveldStage.ts';
import type { PairRow } from './pairs.ts';
import { readSignals, screenFile, signalsFile, stageScreen, stageSignals } from './pipeline.ts';
import { readGz, readSealed, sha256File } from './records.ts';
import { replaysFile, stageReplays } from './replayStage.ts';
import { riskFile, stageRisk } from './riskStage.ts';
import { registryFile, stageAudit, stageFreezeCode, stageFreezeProtocol, stageParity } from './stages.ts';

const usage = `usage: npm run d1-signal-complementarity -- <command> [options]

read-only (sealed records only):
  status                                   every stage record and whether it verifies
  verify                                   freezes, every seal and payload hash, protected inputs
  sources                                  the source records, freezes and their hashes
  universe                                 the 61-symbol candidate registry (views, flags, provenance)
  signals --view U|P-A|P-B|P-F --symbol S [--end 2020-06-30|2021-12-31|2023-12-29]
  pair --view U|P-A|P-B|P-F --a S --b S [--window T|A|B]
  overlap --view U|P-A|P-B|P-F [--window T|A|B] [--metric s5|s20|session|armed|holding|rho] [--top 15]
  occupancy --baseline B4|B5 [--window T|A|B]
  candidate --symbol S --baseline B4|B5 [--view U|P-A|P-B] [--window T|A|B]
  events --view U|P-A|P-B|P-F [--window T|A|B]
  replays                                  the replay menu and ΔV at every cost
  risk                                     matched-horizon pool and portfolio risk
  analysis                                 labels and the overall verdict

write-once stages (in order):
  stage audit | freeze-protocol | parity | freeze-code | screen-A | screen-B |
        signals-2020-06-30 | signals-2021-12-31 | signals-2023-12-29 | leveld | replays | risk | analysis
  stage freeze-code-correction --amendment <id>   a logged correction amendment's code freeze (PROTOCOL §10.3)
(report tables: python3 -I research/d1-all61-signal-capital-complementarity/scripts/report_tables.py, read-only)
`;

const option = (args: string[], name: string, fallback?: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : fallback;
};

const money = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? 'NA'
    : `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const share = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'NA' : `${(100 * value).toFixed(1)}%`;

const stageFiles = (): [string, string][] => [
  ['audit', auditFile],
  ['protocol freeze', protocolFreezeFile],
  ['parity', parityFile],
  ['code freeze', codeFreezeFile],
  ['screen A', screenFile('A')],
  ['screen B', screenFile('B')],
  ['signals 2020-06-30', signalsFile('2020-06-30')],
  ['signals 2021-12-31', signalsFile('2021-12-31')],
  ['signals 2023-12-29', signalsFile('2023-12-29')],
  ['level D', leveldFile],
  ['replays', replaysFile],
  ['risk', riskFile],
  ['analysis', analysisFile],
  ['code freeze 2 (C1)', codeFreezeFileOf(2)],
  ['analysis 2 (C1)', analysisFileOf(2)],
  ['code freeze 3 (C2)', codeFreezeFileOf(3)]
];

const status = async () => {
  for (const [name, file] of stageFiles()) {
    if (!(await fs.pathExists(file))) {
      console.info(`  ${name.padEnd(20)} not started`);
      continue;
    }

    try {
      const sealed = await readSealed<{ finishedAt?: string; frozenAt?: string; bodyHash: string }>(file);

      console.info(
        `  ${name.padEnd(20)} sealed ${sealed.finishedAt ?? sealed.frozenAt ?? ''} ${sealed.bodyHash.slice(0, 12)}`
      );
    } catch (error) {
      console.info(`  ${name.padEnd(20)} DOES NOT VERIFY: ${(error as Error).message}`);
    }
  }
};

// Every payload a sealed record lists ({file, sha256}) must hash as recorded.
const payloadsOf = (value: unknown, found: { file: string; sha256: string }[] = []) => {
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;

    if (typeof item.file === 'string' && typeof item.sha256 === 'string' && /\.(gz|csv|md|svg)$/.test(item.file)) {
      found.push({ file: item.file, sha256: item.sha256 });
    }

    for (const child of Object.values(item)) {
      payloadsOf(child, found);
    }
  }

  return found;
};

const verify = async () => {
  let failures = 0;
  const fail = (message: string) => {
    failures++;
    console.error(`  ✖ ${message}`);
  };

  try {
    await requireCodeFrozen();
    console.info('  ✔ protocol and code unchanged since their freezes');
  } catch (error) {
    fail((error as Error).message);
  }

  try {
    await requireProtected();
    console.info('  ✔ protected inputs unchanged (config, data, prior research, prospective freeze pins)');
  } catch (error) {
    fail((error as Error).message);
  }

  for (const [name, file] of stageFiles()) {
    if (!(await fs.pathExists(file))) {
      continue;
    }

    try {
      const sealed = await readSealed(file);
      const payloads = payloadsOf(sealed);

      for (const payload of payloads) {
        if ((await sha256File(payload.file)) !== payload.sha256) {
          fail(`${name}: ${payload.file} does not hash as sealed`);
        }
      }

      console.info(`  ✔ ${name}: seal verifies (${payloads.length} payloads)`);
    } catch (error) {
      fail(`${name}: ${(error as Error).message}`);
    }
  }

  if (failures > 0) {
    throw new Error(`verify: ${failures} failure(s)`);
  }

  console.info('verify: every check passed');
};

const leveldPayload = async (key: string) => {
  const sealed = await readSealed<
    { payloads: Record<string, { file: string; sha256: string }> } & { bodyHash: string }
  >(leveldFile);
  const payload = sealed.payloads[key];

  if (!payload) {
    throw new Error(`no Level D view-window ${key}; known: ${Object.keys(sealed.payloads).join(', ')}`);
  }

  return readGz<{
    pairs: PairRow[];
    families: { id: string; start: string; end: string; symbols: string[]; decisions: number; regime: string }[];
    perBaseline: Record<
      string,
      { summaries: SymbolSummary[]; occupancy: Record<string, unknown>; q7: Record<string, number> }
    >;
  }>(payload.file, payload.sha256);
};

const viewWindowKey = (view: string, window: string) => {
  const match = matrixViews.find((item) => item.view === view && item.window === window);

  if (!match) {
    throw new Error(`no matrix for ${view} on window ${window}`);
  }

  return `${view}-${window}`;
};

const defaultWindow = (view: string): WindowKey => (view === 'P-A' ? 'A' : view === 'P-B' ? 'B' : 'T');

export const runCli = async (args: string[]) => {
  const [command, name] = args;

  if (command === 'stage') {
    const stages: Record<string, () => Promise<unknown>> = {
      audit: stageAudit,
      'freeze-protocol': stageFreezeProtocol,
      parity: stageParity,
      'freeze-code': stageFreezeCode,
      'screen-A': () => stageScreen('A'),
      'screen-B': () => stageScreen('B'),
      'signals-2020-06-30': () => stageSignals('2020-06-30'),
      'signals-2021-12-31': () => stageSignals('2021-12-31'),
      'signals-2023-12-29': () => stageSignals('2023-12-29'),
      leveld: stageLevelD,
      replays: stageReplays,
      risk: stageRisk,
      analysis: stageAnalysis,
      'freeze-code-correction': () => freezeCodeCorrection(option(args, 'amendment', '')!)
    };
    const stage = name ? stages[name] : undefined;

    if (!stage) {
      throw new Error(`unknown stage ${name}\n${usage}`);
    }

    const started = Date.now();
    const record = (await stage()) as { bodyHash?: string };

    log(
      `stage ${name} sealed (bodyHash ${record?.bodyHash ?? 'n/a'}) in ${((Date.now() - started) / 1000).toFixed(1)} s`
    );
    return;
  }

  switch (command) {
    case 'status':
      return status();
    case 'verify':
      return verify();
    case 'sources': {
      for (const file of [protocolFile, protocolFreezeFile, codeFreezeFile, registryFile]) {
        console.info(`  ${file} ${(await fs.pathExists(file)) ? (await sha256File(file)).slice(0, 16) : '(absent)'}`);
      }

      const audit = await readSealed<
        { protected: { prospectiveFreeze: unknown; baseCommit: string } } & { bodyHash: string }
      >(auditFile);

      console.info(
        JSON.stringify(
          { baseCommit: audit.protected.baseCommit, prospectiveFreeze: audit.protected.prospectiveFreeze },
          null,
          2
        )
      );
      return;
    }
    case 'universe': {
      const registry = await readSealed<{ rows: Record<string, unknown>[] } & { bodyHash: string }>(registryFile);

      for (const row of registry.rows) {
        const views = row.views as Record<string, { status: string; gridKey: string | null }>;

        console.info(
          `${String(row.symbol).padEnd(5)} ${String(row.category).padEnd(16)} ${row.f7Flag ? 'F7 ' : '   '}${row.designerSeen ? 'seen ' : '     '}` +
            (['U', 'P-A', 'P-B', 'P-F'] as const)
              .map((view) => `${view}:${views[view]!.status === 'no nominee' ? 'NA' : views[view]!.gridKey}`)
              .join('  ')
        );
      }

      return;
    }
    case 'signals': {
      const view = option(args, 'view', 'U') as ViewKey;
      const symbol = option(args, 'symbol', 'VGT')!;
      const end = option(args, 'end', '2023-12-29') as DataEnd;
      const runs = await readSignals(end);
      const record = runs.views[view]?.find((item) => item.symbol === symbol);

      if (!record) {
        console.info(`${symbol}: no ${view} record at data end ${end} (no vector, or the view is not run there)`);
        return;
      }

      console.info(
        `${symbol} ${view} through ${end}: ${record.summary.trades} trades, net ${money(record.summary.net)}, minute DD ${money(record.summary.minuteDrawdown)}`
      );

      for (const trade of record.trades) {
        console.info(
          `  #${trade.trade} ${trade.setupKind.padEnd(12)} decision ${trade.decisionNewYork} → exit ${trade.open ? 'open' : trade.exitNewYork} ${trade.exitReason.padEnd(22)} net ${money(trade.net)} MAE ${share(trade.maePercent)}`
        );
      }

      return;
    }
    case 'pair': {
      const view = option(args, 'view', 'U')!;
      const window = option(args, 'window', defaultWindow(view))!;
      const a = option(args, 'a', 'VGT')!;
      const b = option(args, 'b', 'GDX')!;
      const payload = await leveldPayload(viewWindowKey(view, window));

      for (const [x, y] of [
        [a, b],
        [b, a]
      ] as const) {
        const row = payload.pairs.find((item) => item.a === x && item.b === y)!;

        console.info(JSON.stringify(row, null, 1));
      }

      return;
    }
    case 'overlap': {
      const view = option(args, 'view', 'U')!;
      const window = option(args, 'window', defaultWindow(view))!;
      const metric = option(args, 'metric', 's5')!;
      const top = Number(option(args, 'top', '15'));
      const payload = await leveldPayload(viewWindowKey(view, window));
      const value = (row: PairRow) =>
        metric === 'armed'
          ? row.armedShare
          : metric === 'holding'
            ? row.holdShare
            : metric === 'rho'
              ? row.returnCorrelation
              : (row.matchShare[metric] ?? null);
      const rows = payload.pairs
        .filter((row) => row.a < row.b && value(row) !== null)
        .sort((x, y) => value(y)! - value(x)!);

      console.info(
        `${view} ${window}: ${rows.length} unordered pairs with a defined ${metric}; highest and lowest ${top}:`
      );

      for (const row of [...rows.slice(0, top), ...rows.slice(-top)]) {
        console.info(
          `  ${row.a}–${row.b}: ${metric} ${value(row)!.toFixed(3)} (decisions ${row.decisionsA}/${row.decisionsB}, ρ ${row.returnCorrelation?.toFixed(2) ?? 'NA'})`
        );
      }

      return;
    }
    case 'occupancy': {
      const baseline = option(args, 'baseline', 'B5') as BaselineKey;
      const window = option(args, 'window', 'T')!;
      const payload = await leveldPayload(`U-${window}`);

      console.info(
        JSON.stringify(
          { occupancy: payload.perBaseline[baseline]!.occupancy, q7: payload.perBaseline[baseline]!.q7 },
          null,
          1
        )
      );
      return;
    }
    case 'candidate': {
      const symbol = option(args, 'symbol', 'XOP')!;
      const baseline = option(args, 'baseline', 'B4') as BaselineKey;
      const view = option(args, 'view', 'U')!;
      const window = option(args, 'window', defaultWindow(view))!;
      const payload = await leveldPayload(viewWindowKey(view, window));
      const summary = payload.perBaseline[baseline]!.summaries.find((item) => item.symbol === symbol)!;
      const { classified, ...rest } = summary;

      console.info(JSON.stringify(rest, null, 1));
      console.info(`classified trades: ${classified.map((item) => `${item.key}=${item.class}`).join(' ')}`);
      return;
    }
    case 'events': {
      const view = option(args, 'view', 'U')!;
      const window = option(args, 'window', defaultWindow(view))!;
      const payload = await leveldPayload(viewWindowKey(view, window));

      for (const family of payload.families) {
        console.info(
          `  ${family.id} ${family.start} → ${family.end} ${family.regime.padEnd(4)} ${String(family.symbols.length).padStart(2)} ETFs, ${family.decisions} decisions: ${family.symbols.join(' ')}`
        );
      }

      return;
    }
    case 'replays': {
      const sealed = await readSealed<
        {
          results: {
            item: { id: string };
            summary: {
              costs: { cost: string; delta: number }[];
              attribution: { firstOrder: { delta: number }; delta: number };
            };
          }[];
        } & { bodyHash: string }
      >(replaysFile);

      for (const result of sealed.results) {
        console.info(
          `  ${result.item.id.padEnd(48)} ${result.summary.costs.map((cost) => `${cost.cost}: ${money(cost.delta)}`).join('  ')}  first-order ${money(result.summary.attribution.firstOrder.delta)}`
        );
      }

      return;
    }
    case 'risk': {
      const sealed = await readSealed<
        { pools: Record<string, unknown>; portfolios: Record<string, unknown> } & { bodyHash: string }
      >(riskFile);

      console.info(JSON.stringify({ pools: sealed.pools, portfolios: sealed.portfolios }, null, 1));
      return;
    }
    case 'analysis': {
      const latest = (await fs.pathExists(analysisFileOf(2))) ? analysisFileOf(2) : analysisFile;
      const sealed = await readSealed<
        { verdict: string; verdictQualifiers: string[]; kOfN: unknown; counting: string[] } & { bodyHash: string }
      >(latest);

      console.info(`(${latest})`);

      console.info(
        JSON.stringify(
          {
            verdict: sealed.verdict,
            qualifiers: sealed.verdictQualifiers,
            kOfN: sealed.kOfN,
            counting: sealed.counting
          },
          null,
          1
        )
      );
      return;
    }
    default:
      console.info(usage);
      void resultFile;
  }
};
