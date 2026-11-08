// The neighbourhood stage (PROTOCOL.md §7): Priority 2's development neighbourhood instrument, unchanged
// (qualify.ts qualifyMembers with the cutoff label C24 — the same seeds, radii, families and statistics as every C24
// member), on D24 only, for two subjects:
//
// - the primary diagnostic pair (A · D1-first): report-only, never a selection input;
// - Priority 2's frozen joint primary: a reproduction check — every statistic must equal its sealed C24 evidence, or the
//   stage stops before sealing (the comparators' sealed neighbourhoods are then reused as verified).
//
// Before evaluating, every family's ordered neighbour identities are rehashed and must equal the manifest's.
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Lab as P2Lab } from '../vgt-d1-growth-joint/lab.ts';
import { type Evidence, type Member, qualifyMembers, summary } from '../vgt-d1-growth-joint/qualify.ts';
import type { Joint } from '../vgt-d1-growth-joint/space.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { cacheRoot, log, p2, repoRoot, researchDir, resources, resultsDir } from './context.ts';
import { withLab } from './lab.ts';
import { assertManifestGuard, familiesOf, loadP2 } from './manifest.ts';
import { normal, rel, sealJson } from './records.ts';

export const neighbourhoodFile = path.join(resultsDir, 'neighbourhood.json');

// the Evidence fields compared with the sealed record (all of them except the label, lane and kind of the member)
const compared = [
  'id',
  'joint',
  'cell',
  'class',
  'centre',
  'select',
  'confirm',
  'confirmReps',
  'confirmDraws',
  'd1Only',
  'gOnly',
  'allocOnly',
  'small',
  'wide',
  'stress',
  'toggles',
  'removal',
  'gates',
  'qualified',
  'failed',
  'participation'
] as const;

// `pilot`: the interruption tests (development data only): job `pilot-<name>-neighbourhood`, nothing sealed, the
// record written to .cache/<study>/pilot/<name>/neighbourhood.json.
export const runNeighbourhood = async (o: { workers?: number; killWorkerAfter?: number; pilot?: string } = {}) => {
  const workers = o.workers ?? resources.workers;
  const { killWorkerAfter, pilot } = o;

  if (killWorkerAfter && !pilot) throw new Error('--kill-worker-after is for pilot runs only');
  requireStandardAdoption(researchDir, { repoRoot });

  const guard = assertManifestGuard();
  const outFile = pilot ? path.join(cacheRoot, 'pilot', pilot, 'neighbourhood.json') : neighbourhoodFile;

  if (fs.existsSync(outFile)) throw new Error(`${rel(outFile)} exists: the stage runs once`);

  const m = guard.manifest;
  const subjects = m.neighbourhood.subjects as {
    key: string;
    id: string;
    families: { name: string; idsSha256: string }[];
  }[];
  const pairCase = (m.cases as { key: string; joint: Joint }[])[0]!;
  const jp = (m.comparators as { key: string; joint: Joint }[]).find((c) => c.key === 'joint primary')!;

  // the neighbour identities are the frozen ones
  for (const [s, j] of [
    [subjects[0]!, pairCase.joint],
    [subjects[1]!, jp.joint]
  ] as const) {
    const now = familiesOf(j);

    for (const f of s.families)
      if (now.find((x) => x.name === f.name)?.idsSha256 !== f.idsSha256)
        throw new Error(`${s.key}: neighbour family ${f.name} differs from the manifest`);
  }

  const members: Member[] = [
    {
      label: `pair ${pairCase.key}`,
      lane: 'follow-up',
      kind: 'control',
      need: 'mixed',
      joint: pairCase.joint,
      options: {}
    },
    { label: p2.jointPrimaryLabel, lane: 'informed', kind: 'informed', need: 'mixed', joint: jp.joint, options: {} }
  ];
  const started = new Date().toISOString();
  const out = await withLab(
    { job: pilot ? `pilot-${pilot}-neighbourhood` : 'neighbourhood', workers, killWorkerAfter },
    async (lab) => {
      const ev = await qualifyMembers(lab as unknown as P2Lab, members, 'C24');

      return { ev, fresh: lab.fresh, hits: lab.hits, peaks: lab.peaks };
    }
  );
  const [pairEv, jpEv] = out.ev as [Evidence, Evidence];
  const { selection } = loadP2();
  const sealed = (selection.evidence as unknown as Evidence[]).find((e) => e.label === p2.jointPrimaryLabel)!;
  const mine = normal(jpEv);
  const differs = compared.filter(
    (k) =>
      !isDeepStrictEqual(
        (mine as unknown as Record<string, unknown>)[k],
        (sealed as unknown as Record<string, unknown>)[k]
      )
  );

  if (differs.length) {
    const file = path.join(resultsDir, 'neighbourhood-reproduction-FAILED.json');

    fs.writeFileSync(file, `${JSON.stringify({ differs, mine: jpEv, sealed }, null, 1)}\n`);
    throw new Error(
      `the joint primary's neighbourhood differs from its sealed evidence in ${differs.join(', ')}; nothing sealed`
    );
  }

  // the comparators' sealed neighbourhoods (matched definitions: the same instrument and seeds)
  const reuse = [
    p2.jointPrimaryLabel,
    'control: D1 primary + Growth #4 · A',
    'control: D1 primary + Growth 08500a60 · A',
    'control: D1 primary + Growth #4 · B 100/100',
    'control: D1 primary + Growth #4 · B 50/50',
    'control: D1 primary + Growth 08500a60 · B 100/100',
    'control: D1 primary + Growth 08500a60 · B 50/50',
    p2.d1Label,
    p2.gLabel,
    'control: D1 primary alone',
    'control: Growth #4 alone',
    'control: Growth 08500a60 alone'
  ].map((label) => {
    const e = (selection.evidence as unknown as Evidence[]).find((x) => x.label === label)!;

    return {
      label,
      scope:
        e.kind === 'd1only' ? 'D1 only (Growth disabled)' : e.kind === 'gonly' ? 'Growth only (D1 disabled)' : 'joint',
      summary: summary(e),
      select: e.select,
      confirm: e.confirm,
      d1Only: e.d1Only,
      gOnly: e.gOnly,
      small: e.small,
      wide: e.wide,
      stress: Object.fromEntries(Object.entries(e.stress).map(([k, r]) => [k, { net: r.net, dd: r.dd }]))
    };
  });

  const record = {
    stage: 'neighbourhood',
    door: 'D24',
    manifestSha256: guard.sha,
    instrument: m.neighbourhood.instrument,
    use: 'report-only: no case, neighbour or statistic here selects, ranks or replaces a configuration',
    pair: { evidence: pairEv, summary: summary(pairEv) },
    reproduction: {
      subject: p2.jointPrimaryLabel,
      equalToSealed: true,
      fieldsCompared: compared,
      source: 'research/vgt-d1-growth-joint/results/folds/C24/selection.json'
    },
    reused: reuse,
    compute: {
      fresh: out.fresh,
      archiveHits: out.hits,
      peakCgroupBytes: out.peaks.cgroup,
      peakRssBytes: out.peaks.rss,
      workers
    },
    started,
    finished: new Date().toISOString()
  };
  if (pilot) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, `${JSON.stringify(normal(record), null, 1)}\n`);
    log(`pilot ${pilot}: written ${rel(outFile)} (not sealed)`);
    return;
  }

  const sha = sealJson(neighbourhoodFile, record, 'neighbourhood');

  log(
    `neighbourhood sealed (${sha.slice(0, 12)}…): pair confirmation median ${pairEv.confirm.median}, p10 ${pairEv.confirm.p10}, p90 DD ${pairEv.confirm.p90Dd}; joint primary reproduced`
  );
};
