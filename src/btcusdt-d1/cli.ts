// `npm run btc-d1 -- <command>` (research/btcusdt-d1/README.md). Read-only commands: data-audit (verifies the sealed
// audit), verify, list, show, fixed, compare. Stage commands (each refuses to rerun a sealed stage): snapshot, parity,
// benchmark, freeze, fold <fold-a|fold-b>, gate, final, holdout, phenotypes. Nothing here reads `.env`, a
// credential or the network.
import fs from 'node:fs';
import path from 'node:path';
import { auditRaw } from './audit.ts';
import { barsBefore, dateOf } from './calendar.ts';
import { study } from './context.ts';
import { type ExecutionSettings, type StopFill, scenario, stopFills } from './costs.ts';
import { buildDays, runReference } from './engine.ts';
import {
  type PhenotypeFile,
  commonFields,
  listPhenotypes,
  parametersOf,
  readPhenotype,
  writePhenotype
} from './phenotypes.ts';
import { describeGrid, paramsOfGrid } from './params.ts';
import { tablesFor } from './tables.ts';
import { resolveDates, sealedDoor } from './door.ts';
import { procedure, settingsFor } from './protocol.ts';
import { parseRawFile } from './raw.ts';
import {
  type Freeze,
  assertFrozen,
  files,
  reportOnlyChanges,
  hashBody,
  jsonSafe,
  nowIso,
  readSealed,
  sha256File,
  stageFile,
  writeSealed
} from './records.ts';
import { formatReport, summaryOf, writeRunOutputs } from './report.ts';
import { type SnapshotDefinition, buildSnapshot, defineSnapshot, sliceSeries } from './snapshot.ts';
import { prefixSha256 } from './raw.ts';
import {
  describeChronology,
  diagnosticGrid,
  loadStudy,
  runBenchmarkStage,
  runFinalStage,
  runFoldStage,
  runFreezeStage,
  runGateStage,
  runHoldoutStage,
  runParityStage
} from './stages.ts';

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

const workersOf = (args: string[]) => (option(args, 'workers') ? Number(option(args, 'workers')) : undefined);

const auditBody = () => {
  const raw = parseRawFile(study.rawFile);
  const audit = auditRaw(raw);
  const { definition } = defineSnapshot(raw);
  const { dayCoverage, ...rest } = audit;

  return jsonSafe({
    stage: 'data audit',
    raw: rest,
    dayCoverageDigest: hashBody(dayCoverage),
    snapshot: definition
  });
};

const dataAudit = () => {
  if (fs.existsSync(files.audit)) {
    const pinned = readSealed<{ raw: { sha256: string; bytes: number }; snapshot: SnapshotDefinition }>(files.audit);

    // A file that grew after the audit: the sealed audit describes it as of the snapshot; the prefix must verify.
    if (sha256File(study.rawFile) !== pinned.raw.sha256) {
      if (prefixSha256(study.rawFile, pinned.snapshot.snapshotPrefixBytes) !== pinned.snapshot.snapshotPrefixSha256) {
        throw new Error(`${study.rawFile}: the snapshot's first ${pinned.snapshot.snapshotPrefixBytes} bytes changed`);
      }

      console.info(
        `${study.rawFile} changed since the audit (now ${fs.statSync(study.rawFile).size} bytes, ${pinned.raw.bytes} then); the snapshot prefix (${pinned.snapshot.snapshotPrefixBytes} bytes) verifies, so the study's data are unchanged. The sealed audit describes the file as of the snapshot.`
      );
      return pinned;
    }
  }

  const body = auditBody();

  if (fs.existsSync(files.audit)) {
    const sealed = readSealed(files.audit);
    const { bodyHash, writtenAt, ...sealedBody } = sealed as Record<string, unknown>;

    void bodyHash;

    const matches = hashBody(sealedBody) === hashBody(body);

    console.info(
      `${files.audit}: sealed ${String(writtenAt)}; recomputed from ${study.rawFile}: ${matches ? 'MATCHES the sealed audit' : 'DIFFERS from the sealed audit'}`
    );

    if (!matches) {
      throw new Error('The raw file no longer produces the sealed audit');
    }

    return sealed;
  }

  const sealed = writeSealed(files.audit, { writtenAt: nowIso(), ...body });

  console.info(`Sealed ${files.audit} (${sealed.bodyHash})`);
  return sealed;
};

// ---------------------------------------------------------------------------------------------------------------
// Phenotypes from the sealed records.
interface PicksRecord {
  bodyHash: string;
  picks: {
    rank: number;
    key: string;
    grid: Record<string, number>;
    score: number;
    selectionNet: number;
    selectionMinutePercent: number;
  }[];
  noPickReason?: string;
}

const writeAllPhenotypes = () => {
  const { chronology, definition } = loadStudy();

  assertFrozen(procedure, definition.seriesSha256);

  const common = commonFields(chronology, definition);
  const gate = readSealed<{ pass: boolean; folds: { label: string; gate: Record<string, unknown> }[] }>(files.gate);

  if (gate.pass && !fs.existsSync(stageFile('final', 'HOLDOUT.json'))) {
    throw new Error('The procedure gate passed: run the single holdout evaluation before writing the phenotypes');
  }
  const finalPicks = readSealed<PicksRecord>(stageFile('final', 'PICKS.json'));
  const holdout = fs.existsSync(stageFile('final', 'HOLDOUT.json'))
    ? readSealed<{ evidence: { rank: number; principal: unknown }[] }>(stageFile('final', 'HOLDOUT.json'))
    : undefined;
  const sealedDoor = (opened: boolean) => ({
    latestPermittedDay: dateOf(opened ? chronology.lastDay : chronology.holdout.startDay - 1),
    holdoutEvaluated: opened,
    reason: opened
      ? 'the single authorised holdout evaluation included this phenotype (results/final/HOLDOUT.json)'
      : `the holdout ${dateOf(chronology.holdout.startDay)} → ${dateOf(chronology.lastDay)} is sealed for this phenotype`
  });
  const written: string[] = [];
  const gateNote = gate.pass ? [] : ['procedure gate failed (results/PROCEDURE_GATE.json): no phenotype is validated'];

  written.push(
    writePhenotype({
      ...common,
      id: 'diagnostic-vgt-d1',
      status: 'diagnostic',
      description:
        'The unchanged D1 vector of config/phenotypes/D1/VGT.json "primary" (X 21.6% Y 0.3% stop 7.3% hold 8 L 74 buffer 2.9% P 9.0% W 60), run on the BTC clock as an engine diagnostic: not optimised for BTC, never a candidate',
      parameters: parametersOf(diagnosticGrid),
      dataDoor: sealedDoor(false),
      origin: { source: 'config/phenotypes/D1/VGT.json "primary" (ETF sessions reinterpreted as UTC days)' },
      evidence: {
        foldValidation: ['fold-a', 'fold-b'].map((label) => {
          const validation = readSealed<{
            descriptive: { role: string; principal: { net: number; minutePercent: number; entries: number } }[];
          }>(stageFile(`folds/${label}`, 'VALIDATION.json'));
          const row = validation.descriptive.find((entry) => entry.role.startsWith('diagnostic'))!;

          return {
            fold: label,
            net: row.principal.net,
            minutePercent: row.principal.minutePercent,
            entries: row.principal.entries
          };
        })
      },
      gateFailures: ['diagnostic only: not a candidate']
    } as PhenotypeFile)
  );

  for (const label of ['fold-a', 'fold-b']) {
    const picks = readSealed<PicksRecord>(stageFile(`folds/${label}`, 'PICKS.json'));
    const validation = readSealed<{
      bodyHash: string;
      evidence: {
        rank: number;
        principal: { net: number; minutePercent: number; entries: number };
        costs: unknown;
        attribution: unknown;
        neighbours: unknown;
      }[];
      gate: { pass: boolean };
    }>(stageFile(`folds/${label}`, 'VALIDATION.json'));

    for (const pick of picks.picks) {
      const evidence = validation.evidence.find((entry) => entry.rank === pick.rank)!;
      const failures = [
        ...gateNote,
        ...(pick.rank === 1 && !validation.gate.pass ? [`${label} rank-1 validation gate failed`] : []),
        ...(evidence.principal.net <= 0
          ? [`${label} validation net ${evidence.principal.net.toFixed(2)} USDT <= 0`]
          : [])
      ];

      written.push(
        writePhenotype({
          ...common,
          id: `${label}-r${pick.rank}`,
          status: 'research-only',
          description: `Rank-${pick.rank} family of the ${label} selection (bars before ${dateOf(chronology.folds.find((f) => f.label === label)!.validation.startDay)} only): ${describeGrid(pick.grid as never)}`,
          parameters: parametersOf(pick.grid as never),
          dataDoor: sealedDoor(false),
          origin: {
            selection: `results/folds/${label}/PICKS.json`,
            picksBodyHash: picks.bodyHash,
            key: pick.key,
            score: pick.score
          },
          evidence: {
            selection: { net: pick.selectionNet, minutePercent: pick.selectionMinutePercent },
            validation: {
              record: `results/folds/${label}/VALIDATION.json`,
              bodyHash: validation.bodyHash,
              principal: evidence.principal && {
                net: evidence.principal.net,
                minutePercent: evidence.principal.minutePercent,
                entries: evidence.principal.entries
              }
            }
          },
          gateFailures: failures
        } as PhenotypeFile)
      );
    }
  }

  for (const pick of finalPicks.picks) {
    const opened = Boolean(holdout?.evidence.some((entry) => entry.rank === pick.rank));

    written.push(
      writePhenotype({
        ...common,
        id: `final-r${pick.rank}`,
        status: opened ? 'holdout-evaluated research-only' : 'research-only',
        description: `Rank-${pick.rank} family of the final selection (bars before ${dateOf(chronology.holdout.startDay)} only): ${describeGrid(pick.grid as never)}`,
        parameters: parametersOf(pick.grid as never),
        dataDoor: sealedDoor(opened),
        origin: {
          selection: 'results/final/PICKS.json',
          picksBodyHash: finalPicks.bodyHash,
          key: pick.key,
          score: pick.score
        },
        evidence: {
          selection: {
            net: pick.selectionNet,
            minutePercent: pick.selectionMinutePercent,
            note: 'in-sample (development)'
          },
          holdout: opened
            ? holdout!.evidence.find((entry) => entry.rank === pick.rank)!.principal
            : 'not evaluated (sealed)'
        },
        gateFailures: [...gateNote, ...(gate.pass ? [] : ['not validated: retrospective research artifact only'])]
      } as PhenotypeFile)
    );
  }

  for (const file of written) {
    console.info(`  ${file}`);
  }
};

// ---------------------------------------------------------------------------------------------------------------
// fixed / compare: the reference engine on permitted dates.
const settingsFromArgs = (args: string[]): ExecutionSettings => {
  const fee = option(args, 'fee');
  const impact = option(args, 'impact');
  const stop = (option(args, 'stop') ?? 'adverse') as StopFill;

  if (!(stop in stopFills)) {
    throw new Error(`--stop must be one of ${Object.keys(stopFills).join(', ')}`);
  }

  const costs =
    fee === undefined && impact === undefined
      ? procedure.settings.principal.costs
      : scenario(
          Number(fee ?? procedure.settings.principal.costs.feeBps),
          Number(impact ?? procedure.settings.principal.costs.impactBps)
        );

  if (!(costs.feeBps >= 0 && costs.impactBps >= 0)) {
    throw new Error('--fee and --impact are non-negative basis points per side');
  }

  return settingsFor(costs, stop);
};

// Once the freeze exists, the read-only runs use the frozen engine and door code only.
const guardOnceFrozen = (seriesSha256: string) => {
  if (fs.existsSync(files.freeze)) {
    assertFrozen(procedure, seriesSha256);
  }
};

const fixedCommand = (args: string[]) => {
  const id = args[0];

  if (!id) {
    throw new Error(
      'usage: fixed <phenotype-id> [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--dataset development|all|<window>] [--flat] [--fee bps] [--impact bps] [--stop adverse|stop|low] [--mode cash|fixed] [--out dir under evaluations/btcusdt-d1]'
    );
  }

  const { series, chronology, definition } = loadStudy();

  guardOnceFrozen(definition.seriesSha256);

  const { phenotype, grid } = readPhenotype(id);
  const door = sealedDoor(id, grid, chronology);
  const settings = settingsFromArgs(args);
  const mode = (option(args, 'mode') ?? 'cash') as 'cash' | 'fixed';

  if (mode !== 'cash' && mode !== 'fixed') {
    throw new Error('--mode must be cash or fixed');
  }

  const { armFrom, start, end } = resolveDates(args, chronology, door, grid.tickWindowSize);
  const visible = sliceSeries(series, barsBefore(series, end + 1));
  const run = runReference({
    days: buildDays(visible),
    params: paramsOfGrid(grid),
    settings,
    armStartDay: armFrom,
    mode,
    windows: [{ label: 'run', startDay: start, endDay: end + 1 }]
  });
  const description = {
    phenotypeId: id,
    grid,
    settings,
    mode,
    armingFrom: armFrom,
    startDay: start,
    endDay: end + 1,
    dataNote: `bars of ${study.rawFile} snapshot ${dateOf(chronology.historyStartDay)} → ${dateOf(end)} (warm-up before ${dateOf(armFrom)}), nothing later`,
    doorNote: `${phenotype.status}; permitted through ${dateOf(door.latestPermittedDay)} (${door.reason})`
  };
  const report = formatReport(run, description);
  const outDir =
    option(args, 'out') ??
    path.join(
      study.evaluationsDir,
      `${id}_${dateOf(start)}_${dateOf(end)}${armFrom !== start ? `_armed-${dateOf(armFrom)}` : ''}_${settings.costs.label}-stop-${settings.stopFill}_${mode}`
    );
  const written = writeRunOutputs(outDir, run, description, report);

  console.info(report.text);
  console.info(`\nWrote ${written}/report.txt, trades.csv, trades.json, summary.json`);

  if (mode === 'fixed') {
    console.info(
      'Analytical fixed-notional mode: it assumes outside USDT top-ups and is NOT live-executable from the 100,000 USDT account.'
    );
  }
};

const compareCommand = (args: string[]) => {
  const { series, chronology, definition } = loadStudy();

  guardOnceFrozen(definition.seriesSha256);
  const phenotypes = listPhenotypes();
  const settings = settingsFromArgs(args);
  const rows: string[] = [];

  console.info(
    `BTCUSDT spot D1 phenotypes compared on their permitted dates (BTC D1 variants only), ${settings.costs.label}, stops ${settings.stopFill}`
  );

  // The door of each phenotype applies: a holdout request for any sealed phenotype is refused, never silently cut.
  for (const phenotype of phenotypes) {
    const { grid } = readPhenotype(phenotype.id);
    const { armFrom, start, end } = resolveDates(
      args,
      chronology,
      sealedDoor(phenotype.id, grid, chronology),
      grid.tickWindowSize
    );
    const visible = sliceSeries(series, barsBefore(series, end + 1));
    const run = runReference({
      days: buildDays(visible),
      params: paramsOfGrid(grid),
      settings,
      armStartDay: armFrom,
      windows: [{ label: 'run', startDay: start, endDay: end + 1 }]
    });
    const summary = summaryOf(run, {
      phenotypeId: phenotype.id,
      grid,
      settings,
      mode: 'cash',
      armingFrom: armFrom,
      startDay: start,
      endDay: end + 1,
      dataNote: '',
      doorNote: ''
    });

    rows.push(
      [
        phenotype.id.padEnd(18),
        phenotype.status.padEnd(14),
        `${dateOf(start)}→${dateOf(end)}`,
        summary.netProfit.toFixed(0).padStart(10),
        `${(summary.drawdown.minute.percent * 100).toFixed(1)}%`.padStart(7),
        summary.drawdown.minute.usdt.toFixed(0).padStart(8),
        String(summary.trades).padStart(4),
        `${summary.closedTrades ? ((summary.wins / summary.closedTrades) * 100).toFixed(0) : '0'}%`.padStart(5),
        `${(summary.exposure.shareOfWindow * 100).toFixed(0)}%`.padStart(5),
        (summary.fees + summary.impact).toFixed(0).padStart(8)
      ].join('  ')
    );
  }

  console.info(
    [
      'phenotype'.padEnd(18),
      'status'.padEnd(14),
      'dates (UTC days)'.padEnd(21),
      'net USDT'.padStart(10),
      'mDD%'.padStart(7),
      'mDD USDT'.padStart(8),
      'n'.padStart(4),
      'win'.padStart(5),
      'exp'.padStart(5),
      'costs'.padStart(8)
    ].join('  ')
  );

  for (const row of rows) {
    console.info(row);
  }

  console.info(
    'mDD = minute-sampled peak-to-trough of the cash account; costs = fees + impact; exp = share of the window in BTC.'
  );
};

// ---------------------------------------------------------------------------------------------------------------
const verifyCommand = () => {
  const checks: { check: string; ok: boolean; detail: string }[] = [];
  const add = (check: string, fn: () => string) => {
    try {
      checks.push({ check, ok: true, detail: fn() });
    } catch (error) {
      checks.push({ check, ok: false, detail: (error as Error).message.split('\n')[0]! });
    }
  };
  let seriesSha = '';

  add('snapshot: raw prefix and canonical series', () => {
    const { definition } = loadStudy(true);

    seriesSha = definition.seriesSha256;
    return `prefix ${definition.snapshotPrefixSha256.slice(0, 12)}…, series ${definition.seriesSha256.slice(0, 12)}…`;
  });
  add('freeze guard (protocol, procedure, code, snapshot, Node)', () => {
    const freeze = assertFrozen(procedure, seriesSha);

    return `frozen ${freeze.frozenAt}, body ${freeze.bodyHash.slice(0, 12)}…`;
  });

  const sealedFiles: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (/^[A-Z_]+(-r\d+)?\.json$/.test(entry.name)) {
        sealedFiles.push(full);
      }
    }
  };

  walk(files.results);

  for (const file of sealedFiles.sort()) {
    add(`sealed ${path.relative(study.researchDir, file)}`, () => readSealed(file).bodyHash.slice(0, 12) + '…');
  }

  add('phenotypes match the sealed records (grids and doors)', () => {
    const { chronology } = loadStudy();
    const phenotypes = listPhenotypes();

    for (const phenotype of phenotypes) {
      const { grid } = readPhenotype(phenotype.id);
      const door = sealedDoor(phenotype.id, grid, chronology); // refuses ids and grids not in the sealed records

      if (phenotype.dataDoor.latestPermittedDay !== dateOf(door.latestPermittedDay)) {
        throw new Error(
          `${phenotype.id}: its JSON door ${phenotype.dataDoor.latestPermittedDay} is not the sealed ${dateOf(door.latestPermittedDay)}`
        );
      }
    }

    return `${phenotypes.length} phenotype(s)`;
  });
  add('outcome records ran under the frozen code and protocol', () => {
    const freeze = readSealed<Freeze>(files.freeze);
    const stamped = sealedFiles.filter((file) =>
      /(SELECTION|PICKS|VALIDATION|PROCEDURE_GATE|HOLDOUT)\.json$/.test(file)
    );

    for (const file of stamped) {
      const record = readSealed<{ freezeBodyHash: string; outcomeCodeDigest: string; procedureHash: string }>(file);

      if (
        record.freezeBodyHash !== freeze.bodyHash ||
        record.outcomeCodeDigest !== freeze.outcomeCode.digest ||
        record.procedureHash !== freeze.procedureHash
      ) {
        throw new Error(`${file} was not written under the frozen code and protocol`);
      }
    }

    const changed = reportOnlyChanges(freeze);

    return `${stamped.length} outcome record(s)${changed.length ? `; report-only files changed since the freeze: ${changed.join(', ')}` : ''}`;
  });
  add('holdout status', () => {
    const gate = fs.existsSync(files.gate) ? readSealed<{ pass: boolean }>(files.gate) : undefined;
    const opened = fs.existsSync(stageFile('final', 'HOLDOUT.json'));

    if (opened && !gate?.pass) {
      throw new Error('HOLDOUT.json exists without a passing procedure gate');
    }

    return opened
      ? 'evaluated once (gate passed)'
      : `sealed, never evaluated${gate ? ` (gate ${gate.pass ? 'passed' : 'failed'})` : ''}`;
  });
  add('prospective B4/B5 freeze untouched', () => {
    const expected = '407a669b2bfd524502be2afe465c9de0383052ea85dd7ba50df5637c40b0e6f0';
    const { bodyHash, ...body } = JSON.parse(
      fs.readFileSync('research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json', 'utf8')
    ) as { bodyHash: string };

    // The stored body hash is the one recorded when that freeze was made, and the body still hashes to it.
    if (bodyHash !== expected || hashBody(body) !== expected) {
      throw new Error(`body hash ${bodyHash}, recomputed ${hashBody(body)}`);
    }

    return `body ${bodyHash.slice(0, 12)}… (stored and recomputed); its bound files are checked by npm run pools -- verify`;
  });

  for (const row of checks) {
    console.info(`${row.ok ? '✔' : '✖'} ${row.check}: ${row.detail}`);
  }

  const failed = checks.filter((row) => !row.ok).length;

  console.info(`\n${checks.length - failed}/${checks.length} checks pass`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

const listCommand = () => {
  const phenotypes = listPhenotypes();

  if (phenotypes.length === 0) {
    console.info('No BTC phenotype written yet (they are written from the sealed records by `phenotypes`).');
  }

  for (const phenotype of phenotypes) {
    console.info(
      `${phenotype.id.padEnd(18)} ${phenotype.status.padEnd(32)} door through ${phenotype.dataDoor.latestPermittedDay}  ${describeGrid(readPhenotype(phenotype.id).grid)}`
    );
  }
};

const showCommand = (id?: string) => {
  if (!id) {
    throw new Error('usage: show <phenotype-id>');
  }

  console.info(JSON.stringify(readPhenotype(id).phenotype, null, 2));
};

export const runCli = async (args: string[]) => {
  const [command, ...rest] = args;

  switch (command) {
    case 'snapshot': {
      // Pinned to the sealed audit's definition once it exists: only the snapshot prefix is read.
      const { definition } = buildSnapshot(
        fs.existsSync(files.audit) ? readSealed<{ snapshot: SnapshotDefinition }>(files.audit).snapshot : undefined
      );

      console.info(JSON.stringify(definition, null, 2));
      return;
    }
    case 'data-audit':
      dataAudit();
      return;
    case 'chronology': {
      const { chronology } = loadStudy();

      console.info(JSON.stringify(describeChronology(chronology), null, 2));
      return;
    }
    case 'parity': {
      const record = runParityStage();

      console.info(`Sealed parity record ${String(record.rerun)} (${record.bodyHash})`);
      return;
    }
    case 'tables':
      console.info(tablesFor(rest[0] ?? ''));
      return;
    case 'benchmark': {
      const record = await runBenchmarkStage(workersOf(rest));

      console.info(JSON.stringify(record, null, 2));
      return;
    }
    case 'freeze': {
      const record = runFreezeStage();

      console.info(`Sealed ${files.freeze} (${record.bodyHash}) at ${String(record.frozenAt)}`);
      return;
    }
    case 'fold': {
      const record = await runFoldStage(rest[0] ?? '', workersOf(rest));

      console.info(`Sealed validation ${record.bodyHash}`);
      return;
    }
    case 'gate': {
      const record = runGateStage();

      console.info(JSON.stringify(record, null, 2));
      return;
    }
    case 'final': {
      const { picks } = await runFinalStage(workersOf(rest));

      console.info(`Sealed final picks ${picks.bodyHash}`);
      return;
    }
    case 'holdout': {
      const record = await runHoldoutStage(workersOf(rest));

      console.info(`Sealed holdout ${record.bodyHash}`);
      return;
    }
    case 'phenotypes':
      writeAllPhenotypes();
      return;
    case 'verify':
      verifyCommand();
      return;
    case 'list':
      listCommand();
      return;
    case 'show':
      showCommand(rest[0]);
      return;
    case 'fixed':
      fixedCommand(rest);
      return;
    case 'compare':
      compareCommand(rest);
      return;
    default:
      console.info(
        'usage: npm run btc-d1 -- <data-audit|verify|list|show <id>|fixed <id> [options]|compare|chronology|snapshot|parity|benchmark|freeze|fold <fold-a|fold-b>|gate|final|holdout|phenotypes>'
      );
  }
};
