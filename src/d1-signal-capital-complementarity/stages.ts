// The write-once stages of PROTOCOL.md §11, in order. Each verifies its predecessors' seals, writes its record once
// and refuses to run again.
import fs from 'fs-extra';
import { members as poolMembers, nowIso, researchRoot, resultFile, study, type ViewKey } from './context.ts';
import { readUniverseRecord } from './doors.ts';
import { auditFile, freezeCode, freezeProtocol, parityFile, refuseOverrides, requireProtocolFrozen } from './freeze.ts';
import { runParity } from './parity.ts';
import { protectedManifest, protectedOk, readSealed, writeRecord, writeTextOnce } from './records.ts';
import { type ViewMember, viewMembers } from './sources.ts';

export const designerSeen = ['GDX', 'XOP', 'XLE', 'EWZ', 'TLT', 'XLU', 'GLD'];

export const registryFile = resultFile('registry', 'candidate-registry.json');
export const registryCsvFile = resultFile('registry', 'candidate-registry.csv');

const baselineTests = async () => {
  const file = `${researchRoot}/results/logs/baseline-tests.log`;

  if (!(await fs.pathExists(file))) {
    return { file, present: false };
  }

  const text = await fs.readFile(file, 'utf8');
  const value = (label: string) => Number(text.match(new RegExp(`^ℹ ${label} (\\d+)`, 'm'))?.[1] ?? NaN);
  const failures = [...text.matchAll(/^test at (\S+?):\d+:\d+$/gm)].map((match) => match[1]!);

  return {
    file,
    present: true,
    tests: value('tests'),
    pass: value('pass'),
    fail: value('fail'),
    failingFiles: [...new Set(failures)].sort(),
    cause:
      'every failure opens or imports the lowercase src/app/allin-original.ts (renamed src/app/allIn-original.ts); the user fixed only src/optimizer/goldenMaster.ts (a37feae)'
  };
};

export const registryRows = async () => {
  const universe = await readUniverseRecord();
  const views: ViewKey[] = ['U', 'P-A', 'P-B', 'P-F'];
  const byView = Object.fromEntries(
    await Promise.all(views.map(async (view) => [view, await viewMembers(view)] as const))
  ) as Record<ViewKey, ViewMember[]>;

  return [...universe.eligible].sort().map((symbol) => {
    const info = universe.symbols[symbol]!;
    const cell = (view: ViewKey) => byView[view].find((row) => row.symbol === symbol)!;

    return {
      symbol,
      category: info.category,
      tier: info.tier,
      dataSha256: info.dataSha256,
      coverageMedian: info.coverageMedian,
      trainingMedianDollarVolume: info.trainingMedianDollarVolume,
      trainingP10DollarVolume: info.trainingP10DollarVolume,
      trainingMedianBarsPerSession: info.trainingMedianBarsPerSession,
      f7Flag: study.f7.includes(symbol),
      splitsRegistered: info.splitsRegistered,
      designerSeen: designerSeen.includes(symbol) ? 'designer-seen (T, B4)' : '',
      memberOf: (['B4', 'B5'] as const).filter((id) => poolMembers[id].includes(symbol)),
      levelCEligible: {
        B4: !poolMembers.B4.includes(symbol) && symbol !== 'VOOG',
        B5: !poolMembers.B5.includes(symbol) && symbol !== 'VOOG'
      },
      views: Object.fromEntries(
        views.map((view) => {
          const row = cell(view);

          return [
            view,
            {
              status: row.status,
              sourceStatus: row.sourceStatus,
              gridKey: row.gridKey ?? null,
              candidateId: row.candidateId ?? null,
              phenotypeFile: row.phenotypeFile ?? null,
              phenotypeSha256: row.phenotypeSha256 ?? null,
              cap: row.cap,
              provenance: row.provenance,
              reason: row.reason ?? null
            }
          ];
        })
      )
    };
  });
};

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : Array.isArray(value) ? value.join(' ') : String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const stageAudit = async () => {
  refuseOverrides();

  if (await fs.pathExists(auditFile)) {
    throw new Error(`${auditFile} exists`);
  }

  const startedAt = nowIso();
  const manifest = await protectedManifest();

  if (!protectedOk(manifest)) {
    throw new Error(`protected inputs are not clean: ${JSON.stringify(manifest.trackedChangesOutsideStudy)}`);
  }

  const rows = await registryRows();
  const header = [
    'symbol',
    'category',
    'f7Flag',
    'coverageMedian',
    'trainingMedianDollarVolume',
    'designerSeen',
    'memberOf',
    ...(['U', 'P-A', 'P-B', 'P-F'] as const).flatMap((view) => [
      `${view} status`,
      `${view} source status`,
      `${view} grid`,
      `${view} candidate`,
      `${view} cap`
    ]),
    'reason (no vector)'
  ];
  const lines = [header.join(',')];

  for (const row of rows) {
    const views = row.views as Record<
      string,
      {
        status: string;
        sourceStatus: string;
        gridKey: string | null;
        candidateId: string | null;
        cap: string;
        reason: string | null;
      }
    >;

    lines.push(
      [
        row.symbol,
        row.category,
        row.f7Flag,
        row.coverageMedian.toFixed(3),
        Math.round(row.trainingMedianDollarVolume),
        row.designerSeen,
        row.memberOf,
        ...(['U', 'P-A', 'P-B', 'P-F'] as const).flatMap((view) => [
          views[view]!.status,
          views[view]!.sourceStatus,
          views[view]!.gridKey,
          views[view]!.candidateId,
          views[view]!.cap
        ]),
        (['P-A', 'P-B', 'P-F'] as const)
          .map((view) => (views[view]!.reason ? `${view}: ${views[view]!.reason}` : ''))
          .filter(Boolean)
          .join('; ')
      ]
        .map(csvCell)
        .join(',')
    );
  }

  const registry = await writeRecord(registryFile, { stage: 'registry', rows });
  const csv = await writeTextOnce(registryCsvFile, `${lines.join('\n')}\n`);

  return writeRecord(auditFile, {
    stage: 'audit',
    startedAt,
    finishedAt: nowIso(),
    protected: manifest,
    registry: { file: registryFile, bodyHash: registry.bodyHash, csv },
    counts: {
      symbols: rows.length,
      U: rows.filter((row) => (row.views as Record<string, { status: string }>).U!.status !== 'no nominee').length,
      'P-A': rows.filter((row) => (row.views as Record<string, { status: string }>)['P-A']!.status !== 'no nominee')
        .length,
      'P-B': rows.filter((row) => (row.views as Record<string, { status: string }>)['P-B']!.status !== 'no nominee')
        .length,
      'P-F': rows.filter((row) => (row.views as Record<string, { status: string }>)['P-F']!.status !== 'no nominee')
        .length
    },
    baselineTests: await baselineTests()
  });
};

export const stageFreezeProtocol = () => freezeProtocol();

export const stageParity = async () => {
  refuseOverrides();
  await requireProtocolFrozen();

  if (await fs.pathExists(parityFile)) {
    throw new Error(`${parityFile} exists`);
  }

  const startedAt = nowIso();
  const parity = await runParity();
  const failed = parity.checks.filter((item) => !item.pass);

  if (!parity.allPass) {
    const log = `${researchRoot}/results/logs/parity-failed-${startedAt.replace(/[:.]/g, '-')}.json`;

    await fs.ensureDir(`${researchRoot}/results/logs`);
    await fs.writeJson(log, parity, { spaces: 2 });
    throw new Error(`parity failed (${failed.length} of ${parity.checks.length}); details in ${log}`);
  }

  return writeRecord(parityFile, { stage: 'parity', startedAt, finishedAt: nowIso(), ...parity });
};

export const stageFreezeCode = () => freezeCode();

export const readAudit = () => readSealed(auditFile);
