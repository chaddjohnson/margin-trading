// One bounded local study of a family around an anchor: a scrambled-Sobol design on a box, full-run picks by the
// selection policies with coordinate-wise refinement and neighbourhood probes, and the walk-forward of the
// selection rule on the chronological folds against frozen D1. Shared by Tracks A (A2), B and C.
import path from 'node:path';
import {
  type Data,
  type FitKey,
  formatDollars,
  formatSignedDollars,
  fullSpec,
  protocol,
  trainingSpec,
  validationSpec,
  writeJson
} from './context.ts';
import type { Metrics } from './evaluate.ts';
import {
  type Family,
  type IntParams,
  type ParamKey,
  d1Params,
  describeParams,
  familyOf,
  formatValue,
  specs
} from './families.ts';
import type { Evaluator } from './pool.ts';
import {
  type Policy,
  type Row,
  coordinateRefine,
  evaluateRows,
  feasible,
  neighbourhood,
  objectives,
  policies,
  policyDescriptions,
  segmentOf,
  select,
  sobolDesign,
  writeRows
} from './study.ts';

export type Box = Partial<Record<ParamKey, [number, number]>>;

export interface LocalStudyOptions {
  family: Family;
  anchor: IntParams;
  box: Box;
  samples: number;
  seedLabel: string;
  key: string; // file prefix
  label: string;
  dir: string;
  // Reference for the walk-forward comparison (frozen D1 by default).
  reference?: { family: Family; params: IntParams; label: string };
  minEntriesPerYear?: number;
}

export interface WalkForwardRow {
  study: string;
  fold: FitKey;
  policy: Policy;
  pick: IntParams | undefined;
  trainingNet: number | undefined;
  trainingDrawdown: number | undefined;
  validationNet: number | undefined;
  validationDrawdown: number | undefined;
  validationEntries: number | undefined;
  anchorValidationNet: number;
  anchorValidationDrawdown: number;
  referenceValidationNet: number;
  referenceValidationDrawdown: number;
}

export interface PickRecord {
  policy: Policy;
  pick: Row;
  refined: Row;
  rounds: number;
  evaluations: number;
  stability: number;
  probeNetRange: [number, number];
  probeMaxDrawdown: number;
  probeSignatures: number;
}

export interface LocalStudyResult {
  key: string;
  anchorRow: Row;
  fullRows: Row[];
  picks: PickRecord[];
  walkForward: WalkForwardRow[];
  lines: string[];
}

export const canonicalOf = (family: Family, params: IntParams) =>
  family.paramKeys.map((key) => `${key}=${params[key]}`).join(',');

export const minEntriesFor = (ds: Data['ds'], key: FitKey, perYear = 1) => {
  const start = Date.parse(ds.dates[protocol.eligibilityIndex]!);
  const trainEnd = protocol.fits.find((fit) => fit.key === key)!.trainEnd;
  const endIndex = ds.dates.findLastIndex((date) => date <= trainEnd);
  const years = ((Date.parse(ds.dates[endIndex]!) - start) / 86400000 + 1) / 365.25;

  return Math.ceil(years * perYear);
};

export const boundaryKeys = (params: IntParams, box: Box) =>
  (Object.keys(box) as ParamKey[]).filter((key) => params[key] === box[key]![0] || params[key] === box[key]![1]);

export const pctOf = (part: number, whole: number) => `${((100 * part) / whole).toFixed(0)}%`;

export const describeBox = (box: Box) =>
  (Object.keys(box) as ParamKey[])
    .map((key) => `${specs[key].short} ${formatValue(key, box[key]![0])}–${formatValue(key, box[key]![1])}`)
    .join(', ');

export const runLocalStudy = async (
  data: Data,
  evaluator: Evaluator,
  options: LocalStudyOptions
): Promise<LocalStudyResult> => {
  const { ds } = data;
  const { family, anchor, box, samples, seedLabel, key, label, dir } = options;
  const reference = options.reference ?? { family: familyOf('d1'), params: d1Params(familyOf('d1')), label: 'D1' };
  const full = fullSpec(ds);
  const folds = protocol.fits.filter((fit) => fit.validation).map((fit) => fit.key) as FitKey[];
  const freeKeys = Object.keys(box) as ParamKey[];
  const lines: string[] = [];
  const { design, draws } = sobolDesign(family, box, anchor, samples, seedLabel);
  const fullRows = await evaluateRows(evaluator, ds.id, family, full, design, key);
  const anchorRow = fullRows[0]!;
  const referenceFull = (await evaluator.evaluate(ds.id, reference.family.key, full, [reference.params]))[0]!;

  await writeRows(path.join(dir, `${key}_full.csv`), family, fullRows);

  lines.push(
    `## ${label}`,
    '',
    `Family \`${family.key}\`; anchor ${describeParams(family, anchor)}; box ${describeBox(box)}; ${design.length} unique points from ${draws} Sobol draws (seed label '${seedLabel}'); ${fullRows.filter((row) => feasible(row.metrics)).length} feasible on the full run; ${new Set(fullRows.map((row) => row.metrics.signature)).size} distinct trade lists.`,
    ''
  );

  const nets = fullRows.map((row) => row.metrics.net).sort((a, b) => a - b);
  const quantile = (q: number) => nets[Math.min(nets.length - 1, Math.floor(q * nets.length))]!;
  const betterThanAnchor = fullRows.filter(
    (row) => feasible(row.metrics) && row.metrics.net > anchorRow.metrics.net
  ).length;
  const betterThanReference = fullRows.filter(
    (row) => feasible(row.metrics) && row.metrics.net > referenceFull.net
  ).length;
  const dominating = fullRows.filter(
    (row) => row.metrics.net > referenceFull.net && row.metrics.minuteDrawdown <= referenceFull.minuteDrawdown
  ).length;

  lines.push(
    `Full-run net over the design: min ${formatDollars(nets[0]!)}, 10% ${formatDollars(quantile(0.1))}, median ${formatDollars(quantile(0.5))}, 90% ${formatDollars(quantile(0.9))}, max ${formatDollars(nets.at(-1)!)}. Anchor ${formatDollars(anchorRow.metrics.net)} / ${formatDollars(anchorRow.metrics.minuteDrawdown)}; ${reference.label} ${formatDollars(referenceFull.net)} / ${formatDollars(referenceFull.minuteDrawdown)}. Within the ceiling, ${betterThanAnchor} points (${pctOf(betterThanAnchor, fullRows.length)}) beat the anchor's net, ${betterThanReference} (${pctOf(betterThanReference, fullRows.length)}) beat ${reference.label}'s, and ${dominating} (${pctOf(dominating, fullRows.length)}) beat ${reference.label} on both net and drawdown.`,
    '',
    '### Full-run picks (in-sample) and their coordinate refinement',
    '',
    `Policies: ${policies.map((policy) => `${policy} = ${policyDescriptions[policy]}`).join('; ')}. Refinement moves one parameter at a time to its best grid value inside the box until nothing improves the policy's objective.`,
    '',
    '| Policy | Pick | Net | Minute DD | Entries | 2022 net (losses) | 2023 e | Refined | Net | Minute DD | Entries | Rounds / evals | Box edges | Stability | Probe net range | Probe max DD |',
    '|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|---:|---|---:|'
  );

  const cache = new Map<string, Row>();

  for (const row of fullRows) {
    cache.set(canonicalOf(family, row.params), row);
  }

  const picks: PickRecord[] = [];
  const minEntriesFull = minEntriesFor(ds, 'final', options.minEntriesPerYear);

  for (const policy of policies) {
    const pick = select(
      fullRows.filter((row) => row.metrics.entries >= minEntriesFull),
      policy,
      anchorRow.metrics.entries
    );

    if (!pick) {
      lines.push(`| ${policy} | none | | | | | | | | | | | | | | |`);
      continue;
    }

    const refined = await coordinateRefine(
      evaluator,
      ds.id,
      family,
      full,
      pick.params,
      box,
      objectives[policy],
      cache,
      `${key}-refine-${policy}`
    );
    const hood = await neighbourhood(evaluator, ds.id, family, full, refined.row.params, freeKeys);

    picks.push({
      policy,
      pick,
      refined: refined.row,
      rounds: refined.rounds,
      evaluations: refined.evaluations,
      stability: hood.stability,
      probeNetRange: [hood.minNet, hood.maxNet],
      probeMaxDrawdown: hood.maxDrawdown,
      probeSignatures: hood.distinctSignatures
    });
    lines.push(
      `| ${policy} | ${describeParams(family, pick.params, freeKeys)} | ${formatDollars(pick.metrics.net)} | ${formatDollars(pick.metrics.minuteDrawdown)} | ${pick.metrics.entries} | ${formatSignedDollars(segmentOf(pick.metrics, 'r2022')!.net)} (${segmentOf(pick.metrics, 'r2022')!.losses}) | ${segmentOf(pick.metrics, 'r2023')!.entries} | ${describeParams(family, refined.row.params, freeKeys)} | ${formatDollars(refined.row.metrics.net)} | ${formatDollars(refined.row.metrics.minuteDrawdown)} | ${refined.row.metrics.entries} | ${refined.rounds} / ${refined.evaluations} | ${
        boundaryKeys(refined.row.params, box)
          .map((boundary) => specs[boundary].short)
          .join(' ') || 'none'
      } | ${pctOf(hood.stability, 1)} | ${formatDollars(hood.minNet)}–${formatDollars(hood.maxNet)} | ${formatDollars(hood.maxDrawdown)} |`
    );
  }

  // Walk-forward of the selection rule.
  const walkForward: WalkForwardRow[] = [];

  lines.push(
    '',
    '### Walk-forward of the selection rule',
    '',
    `For each fold the design is evaluated on the training window only; the policy picks (feasible, at least ${options.minEntriesPerYear ?? 1} entry per training year); the pick, the anchor and frozen ${reference.label} are then run through the validation window (continuous run from the eligibility session, attributed to the window).`,
    '',
    `| Fold (train → validate) | Policy | Pick | Training net / DD | Validation net / DD / entries | Anchor validation | ${reference.label} validation | Pick − ${reference.label} |`,
    '|---|---|---|---:|---:|---:|---:|---:|'
  );

  for (const fold of folds) {
    const training = trainingSpec(ds, fold);
    const validation = validationSpec(ds, fold);
    const trainingRows = await evaluateRows(evaluator, ds.id, family, training, design, `${key}-${fold}`);
    const minEntries = minEntriesFor(ds, fold, options.minEntriesPerYear);
    const anchorTraining = trainingRows[0]!;
    const [anchorValidation] = await evaluator.evaluate(ds.id, family.key, validation, [anchor]);
    const [referenceValidation] = await evaluator.evaluate(ds.id, reference.family.key, validation, [reference.params]);
    const fit = protocol.fits.find((candidate) => candidate.key === fold)!;

    await writeRows(path.join(dir, `${key}_${fold}_training.csv`), family, trainingRows);

    for (const policy of policies) {
      const pick = select(
        trainingRows.filter((row) => row.metrics.entries >= minEntries),
        policy,
        anchorTraining.metrics.entries
      );
      const validated: Metrics | undefined = pick
        ? (await evaluator.evaluate(ds.id, family.key, validation, [pick.params]))[0]!
        : undefined;

      walkForward.push({
        study: key,
        fold,
        policy,
        pick: pick?.params,
        trainingNet: pick?.metrics.net,
        trainingDrawdown: pick?.metrics.minuteDrawdown,
        validationNet: validated?.net,
        validationDrawdown: validated?.minuteDrawdown,
        validationEntries: validated?.entries,
        anchorValidationNet: anchorValidation!.net,
        anchorValidationDrawdown: anchorValidation!.minuteDrawdown,
        referenceValidationNet: referenceValidation!.net,
        referenceValidationDrawdown: referenceValidation!.minuteDrawdown
      });
      lines.push(
        `| ${fold} (→ ${fit.trainEnd.slice(0, 4)} → ${fit.validation!.start.slice(0, 4)}–${fit.validation!.end.slice(0, 4)}) | ${policy} | ${pick ? describeParams(family, pick.params, freeKeys) : 'none'} | ${pick ? `${formatDollars(pick.metrics.net)} / ${formatDollars(pick.metrics.minuteDrawdown)}` : ''} | ${validated ? `${formatSignedDollars(validated.net)} / ${formatDollars(validated.minuteDrawdown)} / ${validated.entries}` : ''} | ${formatSignedDollars(anchorValidation!.net)} / ${formatDollars(anchorValidation!.minuteDrawdown)} | ${formatSignedDollars(referenceValidation!.net)} / ${formatDollars(referenceValidation!.minuteDrawdown)} | ${validated ? formatSignedDollars(validated.net - referenceValidation!.net) : ''} |`
      );
    }
  }

  lines.push(
    '',
    '| Policy | Stitched pick net | Stitched anchor net | Stitched ' +
      reference.label +
      ' net | Folds where the pick beat ' +
      reference.label +
      ' | Worst pick validation DD | Picks identical across folds |',
    '|---|---:|---:|---:|---:|---:|---|'
  );

  for (const policy of policies) {
    const rows = walkForward.filter((row) => row.policy === policy);
    const made = rows.filter((row) => row.validationNet !== undefined);
    const stitched = made.reduce((total, row) => total + row.validationNet!, 0);
    const anchorTotal = rows.reduce((total, row) => total + row.anchorValidationNet, 0);
    const referenceTotal = rows.reduce((total, row) => total + row.referenceValidationNet, 0);
    const wins = made.filter((row) => row.validationNet! > row.referenceValidationNet).length;
    const distinct = new Set(made.map((row) => canonicalOf(family, row.pick!)));

    lines.push(
      `| ${policy} | ${made.length === rows.length ? formatSignedDollars(stitched) : `${formatSignedDollars(stitched)} (${made.length}/${rows.length} folds)`} | ${formatSignedDollars(anchorTotal)} | ${formatSignedDollars(referenceTotal)} | ${wins}/${rows.length} | ${made.length > 0 ? formatDollars(Math.max(...made.map((row) => row.validationDrawdown!))) : ''} | ${distinct.size === 1 ? 'yes' : `${distinct.size} different`} |`
    );
  }

  lines.push('');

  await writeJson(path.join(dir, `${key}_picks.json`), {
    family: family.key,
    anchor,
    box,
    samples,
    seedLabel,
    picks: picks.map((record) => ({
      policy: record.policy,
      pick: {
        params: record.pick.params,
        net: record.pick.metrics.net,
        minuteDrawdown: record.pick.metrics.minuteDrawdown,
        entries: record.pick.metrics.entries
      },
      refined: {
        params: record.refined.params,
        net: record.refined.metrics.net,
        minuteDrawdown: record.refined.metrics.minuteDrawdown,
        entries: record.refined.metrics.entries,
        signature: record.refined.metrics.signature
      },
      rounds: record.rounds,
      evaluations: record.evaluations,
      stability: record.stability,
      probeNetRange: record.probeNetRange,
      probeMaxDrawdown: record.probeMaxDrawdown,
      probeSignatures: record.probeSignatures
    })),
    walkForward
  });

  return { key, anchorRow, fullRows, picks, walkForward, lines };
};
