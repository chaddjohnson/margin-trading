// The study's commands. Each writes only under research/vg-balanced-entry-eligibility/results/ or .cache/.
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, chronology, log, resultsDir } from './context.ts';
import { resolveControl, controlConfig, runControl } from './control.ts';
import { buildDoors, openDoor } from './data.ts';
import { runVariant } from './engine.ts';
import { cashReconciliation, compareExact, offParity } from './parity.ts';
import type { DoorName } from './context.ts';

const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(value, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 2)}\n`
  );
};

// S2: OFF parity on every door (exact), the cash reconciliation, and door equivalence (D24 prefix = canonical to 2024).
const parity = async (args: string[]) => {
  const doors = (args.length ? args : ['D19', 'D21', 'D23', 'D24', 'FULL']) as DoorName[];
  const { pool } = await resolveControl();
  const rows: Record<string, unknown>[] = [];
  let pass = true;

  for (const door of doors) {
    const opened = await openDoor(door, 'parity (eligibility OFF only)');
    const end = door === 'FULL' ? chronology.validationEnd : undefined;
    const t0 = performance.now();
    const control = runControl(pool, opened.loaded, end);
    const t1 = performance.now();
    const adapter = runVariant(opened.loaded.universe, controlConfig(pool, opened.loaded));
    const t2 = performance.now();
    // the study's own configuration path (evaluate.ts: report periods on) must be OFF-exact too
    const { run } = await import('./evaluate.ts');
    const { OFF } = await import('./specs.ts');
    const studyRun = run(pool, opened, OFF);
    const { eligibility, periods, ...studyConfig } = studyRun.config;
    const configSame =
      compareExact(control.config, studyConfig).equal &&
      Object.keys(eligibility ?? {}).length === 0 &&
      (periods?.length ?? 0) > 0;
    const studyPath = offParity(
      { ...control, config: undefined } as never,
      { ...studyRun, config: undefined } as never
    );

    studyPath.pass &&= configSame;
    const result = offParity(control, adapter);

    result.pass &&= studyPath.pass;
    result.differences.push(...studyPath.differences);
    const cash = cashReconciliation(adapter);
    const row = {
      door,
      lastSession: opened.lastSession,
      sessions: opened.sessions,
      exact: result.pass,
      comparedValues: result.compared,
      differences: result.differences,
      cash,
      control: {
        lots: control.lots.length,
        trades: control.trades.length,
        signals: control.signals.length,
        refused: control.signals.filter((signal) => signal.outcome === 'refused').length,
        net: cash.net,
        minuteDrawdown: control.minuteDrawdown.maximum,
        dailyDrawdown: control.dailyDrawdown.maximum
      },
      seconds: { control: (t1 - t0) / 1000, adapter: (t2 - t1) / 1000 }
    };

    pass &&= result.pass && cash.pass;
    rows.push(row);
    log(
      `${door}: exact ${result.pass ? 'PASS' : 'FAIL'} (${result.compared} values), cash ${cash.pass ? 'PASS' : 'FAIL'}; lots ${control.lots.length}, net ${cash.net.toFixed(2)}, minute DD ${control.minuteDrawdown.maximum.toFixed(2)}`
    );

    for (const difference of result.differences)
      log(`  ${difference.path}: control ${difference.control}, adapter ${difference.adapter}`);
  }

  writeJson(path.join(resultsDir, 'parity', `off-parity${args.length ? `-${doors.join('-')}` : ''}.json`), {
    generatedAt: new Date().toISOString(),
    tolerance: 'exact: every number bit-for-bit equal (NaN = NaN); cash summaries to the cent',
    pass,
    rows
  });

  if (!pass) {
    log('OFF PARITY FAILED: dependent stages must not run');
    process.exitCode = 1;
  }
};

// S2b: the adapter's OFF results written by the runner's own record writers (src/pools/report.ts, study8-runners/lots.ts)
// and compared byte for byte with the runner's outputs archived in results/control/ (dev to 2024-12-31 and full).
const runnerParity = async () => {
  const { pool } = await resolveControl();
  const { runRecordOf, writeRunRecord } = await import('../pools/report.ts');
  const { lotRowsOf, writeLots, exportCheck } = await import('../study8-runners/lots.ts');
  const { poolOptions } = await import('./control.ts');
  const pairs = [
    { door: 'D24' as DoorName, end: chronology.developmentEnd, runner: 'runner-dev-2024-12-31' },
    { door: 'FULL' as DoorName, end: chronology.validationEnd, runner: 'runner-full-2026-10-30' }
  ];
  const files = ['lots.csv', 'trades.csv', 'signals.csv', 'daily.csv', 'yearly.csv', 'monthly.csv', 'lots.txt'];
  const rows: Record<string, unknown>[] = [];
  let pass = true;

  for (const pair of pairs) {
    const opened = await openDoor(pair.door, 'runner-format parity (eligibility OFF only)');
    const result = runVariant(opened.loaded.universe, controlConfig(pool, opened.loaded));
    const outDir = path.join(cacheRoot, 'runner-parity', pair.runner);

    fs.rmSync(outDir, { recursive: true, force: true });

    const options = poolOptions(pair.end);
    const record = await runRecordOf(pool, opened.loaded, result as never, options, outDir);

    await writeRunRecord(record, result as never);
    await writeLots(outDir, lotRowsOf(result as never, record), {
      alias: 's8-vg-balanced',
      window: { first: record.data.first, last: record.data.last },
      costBpsPerSide: options.costBps,
      notionalPerTrade: record.run.notionalPerTrade,
      annualRate: record.run.annualRate
    });

    const exports = await exportCheck(outDir, record);
    const comparisons = files.map((file) => {
      const mine = fs.readFileSync(path.join(outDir, file));
      const theirs = fs.readFileSync(path.join(resultsDir, 'control', pair.runner, file));

      return { file, bytes: mine.length, identical: mine.equals(theirs) };
    });
    const ok = comparisons.every((c) => c.identical) && exports.pass;

    pass &&= ok;
    rows.push({ ...pair, exportCheck: exports.pass, comparisons });
    log(
      `${pair.runner}: ${comparisons.map((c) => `${c.file} ${c.identical ? '=' : '≠'}`).join(', ')}; export check ${exports.pass ? 'PASS' : 'FAIL'}`
    );
  }

  writeJson(path.join(resultsDir, 'parity', 'runner-format-parity.json'), {
    generatedAt: new Date().toISOString(),
    rule: "byte-for-byte equality of the runner's ledger files written from the adapter's OFF result",
    pass,
    rows
  });

  if (!pass) process.exitCode = 1;
};

// S3: Phase A on the development door D24 only.
const audit = async () => {
  const { auditRefusals } = await import('./audit.ts');
  const { toCsv } = await import('../multi-etf-allocator/metrics.ts');
  const { pool } = await resolveControl();
  const opened = await openDoor('D24', 'Phase A audit (control only)');
  const control = runControl(pool, opened.loaded, undefined);
  const report = auditRefusals(control);
  const dir = path.join(resultsDir, 'audit');

  writeJson(path.join(dir, 'phase-a.json'), {
    generatedAt: new Date().toISOString(),
    door: 'D24',
    note: 'descriptive fields (descriptive.*) are eventual paths: never read by any rule; shadowNetHypothetical is the refused shadow trade’s own net, NOT an achievable delayed-entry profit. firstOrder ignores the capital cascade of a delayed lot.',
    ...report
  });
  fs.writeFileSync(
    path.join(dir, 'phase-a-refusals.csv'),
    toCsv(
      report.rows.map(({ firstOrder, descriptive, ...row }) => ({
        ...row,
        ...Object.fromEntries(
          Object.entries(firstOrder).map(([key, value]) => [
            `firstOrder_${key}`,
            value.selectable ? `age ${value.ageAtSelection}` : value.endedBy
          ])
        ),
        ...Object.fromEntries(
          Object.entries(descriptive.closeChange).map(([key, value]) => [`descriptive_close${key}`, value])
        ),
        descriptive_maxHigh20: descriptive.maxHighChange20,
        descriptive_minLow20: descriptive.minLowChange20,
        descriptive_shadowNetHypothetical: descriptive.shadowNetHypothetical
      }))
    )
  );
  log(
    `Phase A: ${report.refusals} refusals of ${report.signals} signals (${JSON.stringify(report.byReason)}); within: ${JSON.stringify(report.within)}`
  );
  log(
    `first-order selectable (VGT/GDX) per case: ${Object.entries(report.firstOrderCases)
      .map(([k, v]) => `${k} ${v.VGT}/${v.GDX}`)
      .join(', ')}`
  );
};

const option = (args: string[], name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1] : fallback;
};

// S5: the pilot (pilot- job names only; never read by a study stage): 12 fixed specs on D24 for containment, memory and
// the interruption/resume tests. `compare-jobs` checks that two archives hold identical records (runtime excluded).
const pilotSpecs = async (args: string[] = []) => {
  const { OFF, gridSpecs } = await import('./specs.ts');
  const grid = gridSpecs();

  return option(args, 'set') === 'grid'
    ? [OFF, ...grid.map((g) => g.spec)]
    : [OFF, ...[0, 7, 19, 22, 28, 33, 39, 44, 50, 55, 59].map((i) => grid[i]!.spec)];
};

const pilot = async (args: string[]) => {
  const { runJob } = await import('./job.ts');
  const name = args[0]!;

  if (!name.startsWith('pilot-')) throw new Error('pilot jobs must be named pilot-*');

  const stopAfter = option(args, 'stop-after');
  const records = await runJob(
    {
      name,
      door: 'D24',
      purpose: 'pilot (infrastructure only)',
      workers: Number(option(args, 'workers', '2')),
      ...(stopAfter ? { stopAfterFresh: Number(stopAfter) } : {})
    },
    await pilotSpecs(args)
  );

  log(`${name}: ${records.length} records`);
};

const compareJobs = async (args: string[]) => {
  const { Store } = await import('../growth140-vgt-s8m/store.ts');
  const { jobDir } = await import('./job.ts');
  const { specId } = await import('./specs.ts');
  const specs = await pilotSpecs(args);
  const read = (name: string) => {
    const store = new Store(path.join(jobDir(name), 'archive.sqlite'), {
      binding: {},
      lruCapacity: 100,
      commitRows: 1,
      commitMs: 0,
      readOnly: true
    });
    const out = specs.map((spec) => {
      const record = store.read<Record<string, unknown>>('points', specId(spec));

      if (!record) throw new Error(`${name}: missing ${specId(spec)}`);

      const { seconds, ...rest } = record;

      void seconds;
      return rest;
    });

    store.close();
    return out;
  };
  const [a, b] = [read(args[0]!), read(args[1]!)];
  const result = compareExact(a, b);

  log(`${args[0]} vs ${args[1]}: ${result.equal ? 'IDENTICAL' : 'DIFFERENT'} (${result.compared} values)`);
  writeJson(path.join(resultsDir, 'pilot', `compare-${args[0]}-${args[1]}.json`), {
    generatedAt: new Date().toISOString(),
    a: args[0],
    b: args[1],
    identical: result.equal,
    compared: result.compared,
    differences: result.differences
  });

  if (!result.equal) process.exitCode = 1;
};

// S6–S7: a fold's selection search and its evaluation (PROTOCOL.md §6–§8).
const search = async (args: string[]) => {
  const { searchFold } = await import('./stages.ts');

  await searchFold(args[0]!, Number(option(args, 'workers', '4')));
};

const evalFold = async (args: string[]) => {
  const { evaluateFold } = await import('./stages.ts');

  await evaluateFold(args[0]!, Number(option(args, 'workers', '2')));
};

// S4: the protocol freeze record (before any eligibility-ON run on real data).
const freeze = async () => {
  const { codeDigest, evaluationFiles } = await import('./job.ts');
  const { sha256File } = await import('./data.ts');
  const { freezeFile, protocolFile, repoRoot } = await import('./context.ts');

  if (fs.existsSync(freezeFile)) throw new Error('the protocol is already frozen');

  const files = fs
    .readdirSync(path.join(repoRoot, 'src/vg-balanced-entry-eligibility'), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.ts'))
    .sort()
    .map((file) => `src/vg-balanced-entry-eligibility/${file}`);

  writeJson(freezeFile, {
    frozenAt: new Date().toISOString(),
    protocol: { file: 'research/vg-balanced-entry-eligibility/PROTOCOL.md', sha256: sha256File(protocolFile) },
    brief: {
      file: 'research/vg-balanced-entry-eligibility/brief/BRIEF.md',
      sha256: sha256File(path.join(path.dirname(protocolFile), 'brief/BRIEF.md'))
    },
    evaluationCodeDigest: codeDigest(),
    evaluationFiles: Object.fromEntries(evaluationFiles.map((file) => [file, sha256File(path.join(repoRoot, file))])),
    studyFiles: Object.fromEntries(files.map((file) => [file, sha256File(path.join(repoRoot, file))])),
    doorsPins: sha256File(path.join(resultsDir, 'doors-pins.json')),
    note: 'no eligibility-ON configuration has run on real data before this record'
  });
  fs.chmodSync(freezeFile, 0o444);
  log(`protocol frozen: ${sha256File(protocolFile)}`);
};

// S8: report-only development diagnostics on D24 (after the C24 selection is sealed).
const diagnostics = async (args: string[]) => {
  const { diagnose } = await import('./diagnostics.ts');

  await diagnose((args[0] ?? 'D24') as DoorName, Number(option(args, 'workers', '6')));
};

// S9–S10: the frozen selection (committed before the validation) and the one-time validation on FULL.
const freezeSelectionCommand = async () => {
  const { freezeSelection } = await import('./validate.ts');

  await freezeSelection();
};

const validateCommand = async (args: string[]) => {
  const { validate } = await import('./validate.ts');

  await validate(Number(option(args, 'workers', '6')));
};

// Report-only illustration (PROTOCOL.md §9 "Examples"): one D1-stress point's ledgers on D24, the reference and OFF.
const example = async (args: string[]) => {
  const { runDetails } = await import('./job.ts');
  const { d1StressSpecs, matched, reference } = await import('./diagnostics.ts');
  const [family, index] = [args[0] as 'explore' | 'confirm', Number(args[1])];
  const row = d1StressSpecs(reference, [family]).find((r) => r.index === index);

  if (!row) throw new Error(`no D1-stress point ${family} ${index}`);

  const [off, variant] = await runDetails<import('./diagnostics.ts').Detail>(
    { name: `example-${family}-${index}`, door: 'D24', purpose: 'report-only example (D1-stress point)', workers: 2 },
    [row.off, row.variant]
  );
  const dir = path.join(resultsDir, 'diagnostics', 'D24', 'examples', `${family}-${index}`);
  const { toCsv } = await import('../multi-etf-allocator/metrics.ts');

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'variant-lots.csv'), toCsv(variant!.lots));
  fs.writeFileSync(path.join(dir, 'off-lots.csv'), toCsv(off!.lots));
  fs.writeFileSync(path.join(dir, 'variant-transitions.csv'), toCsv(variant!.transitions as never));
  writeJson(path.join(dir, 'example.json'), {
    note: 'report-only illustration at a nearby D1 parameter point (development door D24); not a candidate',
    family,
    index,
    d1: row.off.d1,
    off: { net: off!.record.net, dd: off!.record.dd },
    variant: { net: variant!.record.net, dd: variant!.record.dd, late: variant!.record.late },
    matched: matched(off!, variant!)
  });
  log(`example ${family}-${index}: Δ ${(variant!.record.net - off!.record.net).toFixed(2)}`);
};

export const commands: Record<string, (args: string[]) => Promise<void>> = {
  example,
  'freeze-selection': freezeSelectionCommand,
  validate: validateCommand,
  diagnostics,
  freeze,
  search,
  'eval-fold': evalFold,
  pilot,
  'compare-jobs': compareJobs,
  audit,
  'runner-parity': runnerParity,
  help: async () => {
    console.log(Object.keys(commands).join('\n'));
  },
  'build-doors': async () => {
    const pins = await buildDoors();

    for (const [door, pin] of Object.entries(pins))
      log(
        `${door}: ${pin!.firstSession} → ${pin!.lastSession}, ${pin!.sessions} sessions; ${Object.entries(pin!.files)
          .map(([s, f]) => `${s} ${f.bytes} B ${f.sha256.slice(0, 12)}`)
          .join(', ')}`
      );
    void cacheRoot;
  },
  parity
};
