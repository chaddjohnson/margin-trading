// One history's development (PROTOCOL.md §7): L-A broad screening (descriptive; P0), L-B exit-family optimisation on
// the entry controls with the widening rule, the P12 trigger, L-C pairings (joint search with widening, then the
// re-entry step behind its opportunity gate), L-D sizing on the top three per pipeline, and the picks P* (RoD),
// P*-NET, P0 and P*-noE06. Everything reads only the history's development data (the evaluator's pool).
import type { Params } from '../study3-vgt-momentum/signals.ts';
import {
  type Dim,
  type EntryId,
  type ExitFamily,
  type PairingSpec,
  type PolicyKey,
  defaultsOf,
  entryDefaults,
  entryDims,
  exitBoxes,
  fixedExits,
  optimisedExits,
  pairings,
  reentryRules,
  sizingVariants
} from './catalog.ts';
import { exitControls, panelEntries, search } from './context.ts';
import { type Summary, feasibleCenter } from './metrics.ts';
import {
  type CellResult,
  type CellSpec,
  type Evaluator,
  type Scored,
  dimsOfCell,
  jointDraws,
  keyOf,
  plannedPerCell,
  scoreCenter,
  searchCell,
  wideningOf
} from './search.ts';
import type { ReentryRule, SizingSpec } from './types.ts';

export type Selector = 'rod' | 'net';
const scoreOf = (s: Scored, selector: Selector) => (selector === 'rod' ? s.rod : s.netScore);
const eligible = (s: Scored) => feasibleCenter(s.summary) && s.phi >= search.championFeasibility && s.tenBpsNet > 0;
const pricePerDollarDay = (s: Summary) => (s.grossDollarDays > 0 ? s.priceGain / s.grossDollarDays : 0);

export interface Variant {
  label: string; // re-entry rule or sizing key
  key: PolicyKey;
  scored: Scored;
  eligible: boolean;
  pricePerDollarDay: number;
}

export interface FinalPolicy {
  key: PolicyKey;
  policy: string;
  score: number;
  summary: Summary;
  phi: number;
  tenBpsNet: number;
}

export interface PipelineResult {
  champion: { index: number; values: Params; key: PolicyKey; score: number; cell: string; dims: Dim[] };
  reentryGate: { opportunities: number; open: boolean };
  reentry: Variant[];
  reentryChoice: string;
  sizing: Variant[];
  sizingChoice: string;
  final: FinalPolicy;
}

export interface PairingResult {
  id: string;
  entry: EntryId;
  exit: ExitFamily;
  adaptive: boolean;
  search: CellResult;
  widened?: CellResult; // the |wide search, if the rule fired
  usedWidened: boolean;
  eliminated?: string;
  selectors: Partial<Record<Selector, PipelineResult>>;
}

export interface Pick {
  key: PolicyKey;
  policy: string;
  pairing: string;
  score: number;
  summary: Summary;
  dims: Dim[]; // the (possibly widened) box the pick was searched in, prefixed e./x.
  values: Params;
}

export interface DevelopResult {
  history: string;
  planned: number;
  screening: { entry: string; exit: string; reentry: string; policy: string; summary: Summary; feasible: boolean }[];
  exitCells: { result: CellResult; widened?: CellResult; usedWidened: boolean }[];
  adaptive?: { entry: EntryId; exit: ExitFamily; from: string; rod: number };
  pairings: PairingResult[];
  picks: { rod?: Pick; net?: Pick; p0?: Pick; noE06?: Pick };
  evaluations: number;
  duplicates: number;
}

const screeningExits = (): ({ family: ExitFamily } | { fixed: string })[] => [
  ...optimisedExits.map((family) => ({ family })),
  { family: 'XF-T' as const },
  ...Object.keys(fixedExits).map((fixed) => ({ fixed }))
];

const variantCost = () => search.exitCell.joint + 2; // 32 draws + center (new rule or sizing) + its 10 bps check

export const plannedPerHistory = () => {
  const screening = panelEntries.length * screeningExits().length + panelEntries.length * (reentryRules.length - 1);
  const exitCells = optimisedExits.length * exitControls.length * plannedPerCell(search.exitCell.global);
  const pairingCells = (pairings.length + 1) * plannedPerCell(search.pairing.global);
  const reentry = (pairings.length + 1) * (reentryRules.length - 1) * variantCost();
  const sizing = 2 * search.sizingPairings * sizingVariants.length * variantCost();

  // the widening rule's worst case: every L-B cell and every pairing searched once more
  return screening + 2 * exitCells + 2 * pairingCells + 2 * reentry + sizing;
};

const screeningKey = (
  entry: EntryId,
  exit: { family: ExitFamily } | { fixed: string },
  reentry: ReentryRule
): PolicyKey => ({
  entry,
  entryParams: entryDefaults(entry),
  exit: 'family' in exit ? { family: exit.family, params: defaultsOf(exitBoxes[exit.family]) } : exit,
  reentry,
  sizing: { kind: 'Z0' }
});

const cellOf = (key: string, entry: EntryId, exit: ExitFamily, searchEntry: boolean): CellSpec => ({
  key,
  entry,
  entryDims: searchEntry ? entryDims(entry) : [],
  entryFixed: searchEntry ? {} : entryDefaults(entry),
  exit,
  reentry: 'R3F',
  sizing: { kind: 'Z0' }
});

// A cell searched under its declared box, and once more under the widening rule if its RoD champion sits at an edge.
const searchWithWidening = async (
  evaluator: Evaluator,
  cell: CellSpec,
  budget: Parameters<typeof searchCell>[2]
): Promise<{ result: CellResult; widened?: CellResult; usedWidened: boolean; cell: CellSpec }> => {
  const result = await searchCell(evaluator, cell, budget);
  const override = wideningOf(cell, result.rodChampion);

  if (!override) {
    return { result, usedWidened: false, cell };
  }

  const wideCell: CellSpec = { ...cell, key: `${cell.key}|wide`, boxOverride: override };
  const widened = await searchCell(evaluator, wideCell, budget);
  const usedWidened = Boolean(
    widened.rodChampion && (!result.rodChampion || widened.rodChampion.rod > result.rodChampion.rod)
  );

  return { result, widened, usedWidened, cell: usedWidened ? wideCell : cell };
};

const finalOf = (v: Variant): FinalPolicy => ({
  key: v.key,
  policy: v.scored.policy,
  score: NaN,
  summary: v.scored.summary,
  phi: v.scored.phi,
  tenBpsNet: v.scored.tenBpsNet
});

export const developHistory = async (
  evaluator: Evaluator,
  onProgress: (line: string) => void
): Promise<DevelopResult> => {
  const history = evaluator.history;

  // ----- L-A: the screening matrix -----
  const screeningItems: { entry: string; exit: string; reentry: string; key: PolicyKey }[] = [];

  for (const entry of panelEntries) {
    for (const exit of screeningExits()) {
      screeningItems.push({
        entry,
        exit: 'family' in exit ? exit.family : exit.fixed,
        reentry: 'R3F',
        key: screeningKey(entry, exit, 'R3F')
      });
    }

    for (const rule of reentryRules) {
      if (rule !== 'R3F') {
        screeningItems.push({ entry, exit: 'XF', reentry: rule, key: screeningKey(entry, { family: 'XF' }, rule) });
      }
    }
  }

  const screened = await evaluator.evaluate(
    'LA',
    'screening',
    screeningItems.map((item, index) => ({ key: item.key, values: {}, index }))
  );
  const screening = screeningItems.map((item, i) => ({
    entry: item.entry,
    exit: item.exit,
    reentry: item.reentry,
    policy: screened[i]!.policy.id,
    summary: screened[i]!.summary,
    feasible: feasibleCenter(screened[i]!.summary)
  }));

  onProgress(`${history} L-A ${screening.length} cells`);

  // ----- L-B: exit-family optimisation on the entry controls -----
  const exitCells: DevelopResult['exitCells'] = [];

  for (const family of optimisedExits) {
    for (const entry of exitControls) {
      const found = await searchWithWidening(
        evaluator,
        cellOf(`LB|${entry}|${family}`, entry, family, false),
        search.exitCell
      );

      exitCells.push({ result: found.result, widened: found.widened, usedWidened: found.usedWidened });
      onProgress(
        `${history} L-B ${entry} × ${family}${found.widened ? ' (+wide)' : ''}: total ${evaluator.evaluations} evaluations`
      );
    }
  }

  // ----- P12: the best L-B RoD champion cell whose (entry, exit) — XF-T counted as XF — is not already paired -----
  const normal = (exit: string) => (exit === 'XF-T' ? 'XF' : exit);
  const fixedPairs = new Set(pairings.map((p) => `${p.entry}|${normal(p.exit)}`));
  const ranked = exitCells
    .map((c) => (c.usedWidened ? c.widened! : c.result))
    .filter((c) => c.rodChampion)
    .map((c) => {
      const [, entry, exit] = c.cell.replace(/\|wide$/, '').split('|') as [string, EntryId, ExitFamily];

      return { entry, exit, from: c.cell, rod: c.rodChampion!.rod };
    })
    .filter((c) => !fixedPairs.has(`${c.entry}|${normal(c.exit)}`))
    .sort((a, b) => b.rod - a.rod || a.from.localeCompare(b.from));
  const adaptive = ranked[0];
  const pairingList: (PairingSpec & { adaptive: boolean })[] = [
    ...pairings.map((p) => ({ ...p, adaptive: false })),
    ...(adaptive ? [{ id: 'P12', entry: adaptive.entry, exit: adaptive.exit, adaptive: true }] : [])
  ];

  // ----- L-C: pairings (step 1 joint search with widening, step 2 re-entry behind the opportunity gate) -----
  const results: PairingResult[] = [];
  const cells = new Map<string, CellSpec>();

  for (const pairing of pairingList) {
    const found = await searchWithWidening(
      evaluator,
      cellOf(pairing.id, pairing.entry, pairing.exit, true),
      search.pairing
    );
    const used = found.usedWidened ? found.widened! : found.result;
    const cell = found.cell;
    const result: PairingResult = {
      id: pairing.id,
      entry: pairing.entry,
      exit: pairing.exit,
      adaptive: pairing.adaptive,
      search: found.result,
      widened: found.widened,
      usedWidened: found.usedWidened,
      selectors: {}
    };

    cells.set(pairing.id, cell);

    if (!used.rodChampion && !used.netChampion) {
      result.eliminated = used.shortlist.length === 0 ? 'no feasible point' : 'no champion';
    }

    for (const selector of ['rod', 'net'] as Selector[]) {
      const champion = selector === 'rod' ? used.rodChampion : used.netChampion;

      if (!champion) {
        continue;
      }

      const draws = jointDraws(
        dimsOfCell(cell),
        champion.values,
        search.pairing.joint,
        search.pairing.jointRadius,
        `study3b|${history}|${cell.key}|joint|${champion.index}`
      );
      const opportunities = champion.summary.reentryOpportunities;
      const open = opportunities >= search.reentryMinOpportunities;
      const variants: Variant[] = [];

      for (const rule of open ? reentryRules : (['R3F'] as ReentryRule[])) {
        const scored =
          rule === 'R3F' ? champion : await scoreCenter(evaluator, cell, `reentry-${rule}`, champion, draws, rule);

        variants.push({
          label: rule,
          key: keyOf(cell, champion.values, rule),
          scored,
          eligible: eligible(scored),
          pricePerDollarDay: pricePerDollarDay(scored.summary)
        });
      }

      const base = variants[0]!;
      const choice =
        variants
          .filter((v) => v.eligible)
          .sort(
            (a, b) =>
              scoreOf(b.scored, selector) - scoreOf(a.scored, selector) ||
              (a.label === 'R3F'
                ? -1
                : b.label === 'R3F'
                  ? 1
                  : reentryRules.indexOf(a.label as ReentryRule) - reentryRules.indexOf(b.label as ReentryRule))
          )[0] ?? base;

      result.selectors[selector] = {
        champion: {
          index: champion.index,
          values: champion.values,
          key: keyOf(cell, champion.values),
          score: scoreOf(champion, selector),
          cell: cell.key,
          dims: dimsOfCell(cell)
        },
        reentryGate: { opportunities, open },
        reentry: variants,
        reentryChoice: choice.label,
        sizing: [],
        sizingChoice: 'Z0',
        final: { ...finalOf(choice), score: scoreOf(choice.scored, selector) }
      };
    }

    results.push(result);
    onProgress(
      `${history} L-C ${pairing.id} ${pairing.entry} × ${pairing.exit}${found.widened ? ' (+wide)' : ''}: total ${evaluator.evaluations}`
    );
  }

  // ----- L-D: sizing on the three best pairings per pipeline -----
  for (const selector of ['rod', 'net'] as Selector[]) {
    const top = results
      .filter((r) => r.selectors[selector])
      .sort(
        (a, b) => b.selectors[selector]!.final.score - a.selectors[selector]!.final.score || a.id.localeCompare(b.id)
      )
      .slice(0, search.sizingPairings);

    for (const result of top) {
      const entry = result.selectors[selector]!;
      const cell = cells.get(result.id)!;
      const rule = entry.reentryChoice as ReentryRule;
      const center = { index: entry.champion.index, values: entry.champion.values };
      const draws = jointDraws(
        dimsOfCell(cell),
        center.values,
        search.pairing.joint,
        search.pairing.jointRadius,
        `study3b|${history}|${cell.key}|joint|${center.index}`
      );
      const z0Price = pricePerDollarDay(entry.final.summary);
      const variants: Variant[] = [];

      for (const variant of sizingVariants) {
        const scored = await scoreCenter(
          evaluator,
          cell,
          `sizing-${variant.key}`,
          center,
          draws,
          rule,
          variant.spec as SizingSpec
        );

        variants.push({
          label: variant.key,
          key: keyOf(cell, center.values, rule, variant.spec),
          scored,
          eligible: eligible(scored),
          pricePerDollarDay: pricePerDollarDay(scored.summary)
        });
      }

      entry.sizing = variants;

      const better = variants
        .filter((v) => v.eligible && scoreOf(v.scored, selector) > entry.final.score && v.pricePerDollarDay >= z0Price)
        .sort(
          (a, b) =>
            scoreOf(b.scored, selector) - scoreOf(a.scored, selector) ||
            sizingVariants.findIndex((x) => x.key === a.label) - sizingVariants.findIndex((x) => x.key === b.label)
        )[0];

      if (better) {
        entry.sizingChoice = better.label;
        entry.final = { ...finalOf(better), score: scoreOf(better.scored, selector) };
      }
    }

    onProgress(`${history} L-D ${selector}: ${top.map((t) => t.id).join(', ')} (total ${evaluator.evaluations})`);
  }

  // ----- picks -----
  const pickOf = (selector: Selector, filter: (r: PairingResult) => boolean = () => true): Pick | undefined => {
    const best = results
      .filter((r) => r.selectors[selector] && filter(r))
      .sort(
        (a, b) => b.selectors[selector]!.final.score - a.selectors[selector]!.final.score || a.id.localeCompare(b.id)
      )[0];

    if (!best) {
      return undefined;
    }

    const entry = best.selectors[selector]!;
    const final = entry.final;

    return {
      key: final.key,
      policy: final.policy,
      pairing: best.id,
      score: final.score,
      summary: final.summary,
      dims: entry.champion.dims,
      values: entry.champion.values
    };
  };

  const p0Row = screening
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => row.feasible && row.reentry === 'R3F' && (optimisedExits as string[]).includes(row.exit))
    .sort((a, b) => b.row.summary.net - a.row.summary.net || a.i - b.i)[0];
  const p0Cell = p0Row ? cellOf('P0', p0Row.row.entry as EntryId, p0Row.row.exit as ExitFamily, true) : undefined;
  const p0: Pick | undefined =
    p0Row && p0Cell
      ? {
          key: screeningItems[p0Row.i]!.key,
          policy: p0Row.row.policy,
          pairing: `LA|${p0Row.row.entry}|${p0Row.row.exit}`,
          score: p0Row.row.summary.net,
          summary: p0Row.row.summary,
          dims: dimsOfCell(p0Cell),
          values: Object.fromEntries([
            ...Object.entries(screeningItems[p0Row.i]!.key.entryParams).map(([k, v]) => [`e.${k}`, v]),
            ...Object.entries(defaultsOf(exitBoxes[p0Row.row.exit as ExitFamily])).map(([k, v]) => [`x.${k}`, v])
          ])
        }
      : undefined;

  return {
    history,
    planned: plannedPerHistory(),
    screening,
    exitCells,
    adaptive,
    pairings: results,
    picks: { rod: pickOf('rod'), net: pickOf('net'), p0, noE06: pickOf('rod', (r) => r.entry !== 'E06') },
    evaluations: evaluator.evaluations,
    duplicates: evaluator.duplicates
  };
};
