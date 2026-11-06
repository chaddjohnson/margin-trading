// The validation stage (PROTOCOL.md §9), run once. It refuses unless FROZEN_SELECTION.json is sealed, committed to git
// and unchanged, the chain verifies, the decision-relevant code equals the frozen digest's files, and no validation
// record exists. It then opens the validation door (the whole file, split-adjusted), evaluates every frozen role holder
// with Study 8's test evidence and T1–T7, and — report-only, labelled — the other shortlist members and B1. It also
// writes the per-trade ledgers, per-year tables and execution sensitivities of the continuous run, all inside the same
// single door opening.
import path from 'node:path';
import fs from 'fs-extra';
import {
  chronology,
  executionSettings,
  frozenSelectionFile,
  type Grid,
  resultFile,
  validationDoor
} from './context.ts';
import { b1Grid, dailyEngineParams, dailyFit } from './control.ts';
import { loadValidationSessions } from './data.ts';
import { type ExecutionSettings, simulate, type RunResult } from './engine.ts';
import { evidenceOf, periodStats, testGatesOf } from './evidence.ts';
import { compactFit, floorsOf } from './fitness.ts';
import { type DoorView, ParallelLab, baseSettings, doorView, runGrid, settingsWith } from './lab.ts';
import { ledgerRows, type LedgerRow } from './ledger.ts';
import { sessionClock } from './periods.ts';
import { recordOf } from './records.ts';
import {
  appendChain,
  fileSha256,
  git,
  log,
  readChain,
  readSealed,
  recordDoor,
  verifyChain,
  writeCsv,
  writeSealed
} from './seal.ts';
import { describe } from './space.ts';
import { concentration, frequency, windowSummary, yearTable } from './tables.ts';

// The files whose code decides trades, metrics or gates: they must equal the frozen digest's.
export const decisionFiles = [
  'src/intraday-d1/context.ts',
  'src/intraday-d1/control.ts',
  'src/intraday-d1/data.ts',
  'src/intraday-d1/engine.ts',
  'src/intraday-d1/evidence.ts',
  'src/intraday-d1/fitness.ts',
  'src/intraday-d1/lab.ts',
  'src/intraday-d1/periods.ts',
  'src/intraday-d1/records.ts',
  'src/intraday-d1/space.ts',
  'src/intraday-d1/worker.ts',
  'src/study8-expanded-regime-d1/context.ts',
  'src/study8-expanded-regime-d1/fitness.ts',
  'src/study8-expanded-regime-d1/stats.ts',
  'src/lib/session.ts',
  'src/lib/csv.ts',
  'src/lib/calendar.ts',
  'src/lib/corporateActions.ts',
  'config/market-events/splits.json'
];

interface Frozen {
  bodyHash: string;
  code: { digest: string; files: Record<string, string> };
  ranked: { rank: number; role: string; id: string; grid: Grid }[];
  records: { qualification: { file: string } };
}

const validationDir = resultFile('validation');
const out = path.join(validationDir, 'validation.json');

const guard = async () => {
  if (await fs.pathExists(out)) throw new Error(`${out} exists: validation runs once`);

  const frozen = await readSealed<Frozen>(frozenSelectionFile);

  git(`ls-files --error-unmatch ${frozenSelectionFile}`);

  if (git(`status --porcelain -- ${frozenSelectionFile}`) !== '') {
    throw new Error(`${frozenSelectionFile} differs from its committed version`);
  }

  const chain = await readChain();

  if (!chain.some((e) => e.phase === 'selection')) throw new Error('the selection phase is not sealed');
  if (chain.some((e) => e.phase === 'validation')) throw new Error('the validation phase is already sealed');

  const verified = await verifyChain();

  if (verified.problems.length) throw new Error(`chain verification failed: ${verified.problems.join('; ')}`);

  for (const file of decisionFiles) {
    const frozenHash = frozen.code.files[file];

    if (!frozenHash) throw new Error(`${file} is not in the frozen code digest`);
    if ((await fileSha256(file)) !== frozenHash) throw new Error(`${file} changed after the freeze`);
  }

  return frozen;
};

const breakEven = async (lab: ParallelLab, grid: Grid, key: 'DEV' | 'VAL') => {
  const netAt = async (costBps: number) =>
    (await lab.points([{ grid, settings: settingsWith({ costBps }) }]))[0]!.periods[key]!;

  if ((await netAt(0)) <= 0) return { bps: 0, note: 'not profitable before costs' };

  let lo = 0;
  let hi = 200;

  if ((await netAt(hi)) > 0) return { bps: hi, note: 'profitable even at 200 bps per side' };

  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;

    if ((await netAt(mid)) > 0) lo = mid;
    else hi = mid;
  }

  return { bps: Math.round(((lo + hi) / 2) * 100) / 100, note: 'per side, where the window net crosses 0' };
};

// Pro-rata (exposure-time) interest instead of calendar nights, re-accounted on the fixed ledger (decisions unchanged).
const proRata = (rows: readonly LedgerRow[], rate: number) =>
  rows.reduce(
    (acc, r) => {
      const prorated = (Number(r.notional) * rate * (Number(r.holding_minutes) * 60)) / (365 * 86400);

      return { net: acc.net + Number(r.net) + Number(r.financing) - prorated, interest: acc.interest + prorated };
    },
    { net: 0, interest: 0 }
  );

const analyse = async (
  lab: ParallelLab,
  view: DoorView,
  candidate: string,
  run: (settings: ExecutionSettings) => RunResult
) => {
  const result = run(baseSettings);
  const rows = ledgerRows({ candidate, view, settings: baseSettings }, result);
  const devEnd = view.developmentEndSession;
  const dev = rows.filter((r) => String(r.entry_session) <= chronology.developmentEnd);
  const val = rows.filter((r) => String(r.entry_session) > chronology.developmentEnd);
  const in2025 = rows.filter((r) => String(r.entry_session).startsWith('2025'));
  const in2026 = rows.filter((r) => String(r.entry_session).startsWith('2026'));
  const record = recordOf(view.market, result, view.window, view.ranges);
  const sessionsDev = devEnd + 1 - view.window.armFromSession;
  const sessionsVal = view.window.endSession - devEnd;

  return {
    result,
    rows,
    record,
    windows: [
      windowSummary('development 2016–2024 (by entry)', dev, { attributedNet: record.periods.DEV }),
      windowSummary(`validation 2025-01-02 → ${view.sessions.at(-1)!.date} (by entry)`, val, {
        attributedNet: record.periods.VAL
      }),
      windowSummary('2025', in2025, { attributedNet: record.periods['2025'] }),
      windowSummary(`2026 (partial, to ${view.sessions.at(-1)!.date})`, in2026, {
        attributedNet: record.periods['2026~partial']
      })
    ],
    years: yearTable(view, result, rows),
    frequency: { development: frequency(dev, sessionsDev), validation: frequency(val, sessionsVal) },
    concentration: { development: concentration(dev), validation: concentration(val) },
    straddling: rows.filter((r) => r.window === 'straddles 2024/2025').length,
    proRataInterest: { development: proRata(dev, baseSettings.rate), validation: proRata(val, baseSettings.rate) }
  };
};

export const runValidation = async () => {
  const frozen = await guard();
  const loaded = await loadValidationSessions({ frozenBodyHash: frozen.bodyHash });

  await recordDoor('validation', 'validation (once)', loaded.sha256, loaded.lastDate);
  log(
    `validation door opened: ${loaded.firstDate} → ${loaded.lastDate}, splits ${JSON.stringify(loaded.splitsApplied)}`
  );

  if (loaded.lastDate !== validationDoor.lastCompleteSession) {
    throw new Error(`the data end at ${loaded.lastDate}, not the pinned ${validationDoor.lastCompleteSession}`);
  }

  const view = doorView('validation', loaded.sessions);
  const lab = new ParallelLab(view, { door: 'validation', frozenBodyHash: frozen.bodyHash });
  const floors = floorsOf(view.y, 2016, 2026);
  const devEnd = view.developmentEndSession;
  const yTest = (view.window.endSession - devEnd) / 252;
  const qualification = await readSealed<{ candidates: { id: string; pick: string; grid: Grid }[] }>(
    frozen.records.qualification.file
  );
  const holderIds = new Set(frozen.ranked.map((h) => h.id));
  const list = [
    ...frozen.ranked.map((h) => ({ id: h.id, grid: h.grid, label: `rank ${h.rank} (${h.role})`, gated: true })),
    ...qualification.candidates
      .filter((c) => !holderIds.has(c.id))
      .map((c) => ({ id: c.id, grid: c.grid, label: `shortlist ${c.pick} (diagnostic, not a holder)`, gated: false }))
  ];
  const evaluated = [];

  await fs.ensureDir(validationDir);

  try {
    for (const item of list) {
      const ev = await evidenceOf(lab, item.grid, {
        prefix: 'test',
        fold: 'VAL',
        floors,
        trainKey: 'DEV',
        testKey: 'VAL'
      });
      const a = await analyse(lab, view, item.id, (settings) => runGrid(view, item.grid, settings, { marks: true }));
      const valRows = a.rows.filter((r) => String(r.entry_session) > chronology.developmentEnd);
      const testEpisodes = new Set(
        valRows.map(
          (r) =>
            `${String(r.entry_session).slice(0, 4)}Q${Math.floor((Number(String(r.entry_session).slice(5, 7)) - 1) / 3) + 1}`
        )
      ).size;
      const gates = testGatesOf(ev, floors, { testKey: 'VAL', yTest, testLots: valRows.length, testEpisodes });
      const sensitivities: Record<string, unknown> = {};

      for (const setting of [
        ...executionSettings,
        { key: 'cost1', costBps: 1 },
        { key: 'cost3', costBps: 3 },
        { key: 'minuteLow', stopFill: 'minute-low' as const }
      ]) {
        const { key, ...overrides } = setting;
        const [record] = await lab.points([
          { grid: item.grid, settings: settingsWith(overrides as Partial<ExecutionSettings>) }
        ]);

        sensitivities[key] = { dev: record!.periods.DEV, val: record!.periods.VAL, net: record!.net, dd: record!.dd };
      }

      const breakEvenBps = {
        development: await breakEven(lab, item.grid, 'DEV'),
        validation: await breakEven(lab, item.grid, 'VAL')
      };
      const file = path.join(validationDir, `ledger-${item.id}.csv`);

      await writeCsv(file, a.rows as unknown as Record<string, unknown>[]);
      await writeCsv(path.join(validationDir, `years-${item.id}.csv`), a.years as unknown as Record<string, unknown>[]);
      log(
        `${item.label} ${item.id}: ${item.gated ? `T-status ${gates.status} ${gates.failed.join(',')}` : 'diagnostic'}; DEV ${a.record.periods.DEV}, VAL ${a.record.periods.VAL}`
      );
      evaluated.push({
        ...item,
        describe: describe(item.grid),
        status: item.gated ? gates.status : `diagnostic (${gates.status})`,
        gates,
        evidence: {
          decisive: ev.decisive,
          perRep: ev.perRep,
          alternates: ev.alternates,
          nearBound: ev.nearBound,
          clipping: ev.clipping,
          stress: ev.stress,
          fit: compactFit(ev.fit)
        },
        centre: {
          ...ev.centre,
          record: undefined,
          periods: a.record.periods,
          dd: a.record.dd,
          ddDaily: a.record.ddDaily
        },
        windows: a.windows,
        years: a.years,
        frequency: a.frequency,
        concentration: a.concentration,
        straddling: a.straddling,
        proRataInterest: a.proRataInterest,
        sensitivities,
        breakEvenBps,
        ledger: { file, sha256: await fileSha256(file), rows: a.rows.length }
      });
    }

    // B1 (daily D1 primary, session clock), report-only
    const b1Run = (settings: ExecutionSettings) =>
      simulate(
        view.market,
        sessionClock(view.market, view.sessions),
        dailyEngineParams(b1Grid),
        settings,
        view.window,
        { marks: true }
      );
    const b1 = await analyse(lab, view, 'B1', b1Run);
    const b1Test = dailyFit(
      view,
      [1, 2, 3].map((rep) => ({ name: `test#${rep}`, n: 128, labels: ['test', 'V', 'VAL', rep] })),
      floors,
      'test 1–3'
    );
    const b1File = path.join(validationDir, 'ledger-B1.csv');

    await writeCsv(b1File, b1.rows as unknown as Record<string, unknown>[]);
    await writeCsv(path.join(validationDir, 'years-B1.csv'), b1.years as unknown as Record<string, unknown>[]);

    const preferred = evaluated.find((e) => e.gated);
    const recommendation = !preferred
      ? 'no robust edge (no development-qualified role holder)'
      : preferred.status === 'pass'
        ? 'viable candidate'
        : preferred.status === 'ambiguous'
          ? 'promising but unproven'
          : 'no robust edge demonstrated (development-qualified, failed validation)';
    const record = await writeSealed(out, {
      stage: 'VALIDATION',
      door: {
        first: loaded.firstDate,
        last: loaded.lastDate,
        sha256: loaded.sha256,
        splits: loaded.splitsApplied,
        sessions: view.sessions.length
      },
      y: view.y,
      yTest,
      floors,
      frozenBodyHash: frozen.bodyHash,
      candidates: evaluated,
      b1: {
        grid: b1Grid,
        periods: b1.record.periods,
        dd: b1.record.dd,
        test: { nb: b1Test.nb, validation: periodStats(b1Test.records, 'VAL') },
        windows: b1.windows,
        years: b1.years,
        ledger: { file: b1File, sha256: await fileSha256(b1File), rows: b1.rows.length }
      },
      preferred: preferred ? { id: preferred.id, status: preferred.status } : null,
      recommendation
    });

    log(`validation sealed ${record.bodyHash.slice(0, 12)}; recommendation: ${recommendation}`);
    await appendChain('validation', [
      out,
      ...(await fs.readdir(validationDir)).filter((f) => f.endsWith('.csv')).map((f) => path.join(validationDir, f))
    ]);
  } finally {
    await lab.close();
  }
};

export { runGrid, recordOf };
